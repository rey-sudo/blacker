use anyhow::Result;
use chrono::{DateTime, TimeZone, Timelike, Utc};
use pulsar::{Error as PulsarError, Pulsar, SerializeMessage, TokioExecutor, producer};
use tokio::{sync::mpsc, task::JoinHandle};
use tracing::{info, warn};

use crate::{
    clients::{
        binance::Binance,
        client::{AnyClient, Client, create_client},
    },
    common::{candle::Candle, tick::Tick},
    config::Config,
    infrastructure::database::Database,
};

/// Commands sent from dispatcher to symbol worker
pub enum SymbolCommand {
    Tick(Tick),
    Shutdown,
}

/// In-memory OHLC state for the current 1m candle
#[derive(Debug, Clone, serde::Serialize)]
pub struct LiveCandle {
    pub open: f64,
    pub high: f64,
    pub low: f64,
    pub close: f64,
    pub quantity: f64,
    pub minute: DateTime<Utc>,
}

impl LiveCandle {
    fn new(tick: &Tick, minute: DateTime<Utc>) -> Self {
        Self {
            open: tick.price,
            high: tick.price,
            low: tick.price,
            close: tick.price,
            quantity: tick.quantity,
            minute,
        }
    }

    fn update(&mut self, tick: &Tick) {
        self.high = self.high.max(tick.price);
        self.low = self.low.min(tick.price);
        self.close = tick.price;
        self.quantity += tick.quantity;
    }
}

/// Implement SerializeMessage para enviar por Pulsar
impl SerializeMessage for LiveCandle {
    fn serialize_message(candle: Self) -> Result<producer::Message, PulsarError> {
        let payload =
            serde_json::to_vec(&candle).map_err(|e| PulsarError::Custom(e.to_string()))?;
        Ok(producer::Message {
            payload,
            ..Default::default()
        })
    }
}

/// Convierte unix millis a DateTime<Utc> y trunca a minuto
fn ts_to_minute(ts_millis: i64) -> DateTime<Utc> {
    let dt = Utc
        .timestamp_millis_opt(ts_millis)
        .single()
        .expect("invalid tick timestamp");

    dt.with_second(0).unwrap().with_nanosecond(0).unwrap()
}

/// Spawn a dedicated worker task for a symbol
pub fn spawn_symbol_worker(
    symbol: String,
    mut rx: mpsc::Receiver<SymbolCommand>,
    db: Database,
    pulsar: Pulsar<TokioExecutor>,
    config: Config,
) -> JoinHandle<Result<()>> {
    tokio::spawn(async move {
        info!("Symbol worker started for {}", symbol);

        let client: Box<dyn AnyClient> = create_client(&config)?;

        let _last_closed_minute: i64 =
            backfill_and_init(&symbol, &db.pool(), client.as_ref()).await?;

        // ────────────────
        // 2. Pulsar producers (non-persistent)
        // ────────────────
        let mut live_producer: pulsar::Producer<TokioExecutor> = pulsar
            .producer()
            .with_topic("non-persistent://public/market-data/ohlcv-1m-live")
            .build()
            .await?;

        let mut closed_producer: pulsar::Producer<TokioExecutor> = pulsar
            .producer()
            .with_topic("non-persistent://public/market-data/ohlcv-1m-closed")
            .build()
            .await?;

        // ────────────────
        // 3. Live state
        // ────────────────
        let mut current_candle: Option<LiveCandle> = None;

        // ────────────────
        // 4. Event loop
        // ────────────────
        while let Some(cmd) = rx.recv().await {
            match cmd {
                SymbolCommand::Tick(tick) => {
                    let tick_minute = ts_to_minute(tick.ts);

                    match &mut current_candle {
                        Some(candle) if candle.minute == tick_minute => {
                            candle.update(&tick);
                            publish_live(&mut live_producer, &symbol, candle).await?;
                        }

                        Some(candle) => {
                            // Minute rollover → close candle
                            persist_closed(&db.pool(), &symbol, candle).await?;
                            publish_closed(&mut closed_producer, &symbol, candle).await?;

                            let new_candle = LiveCandle::new(&tick, tick_minute);
                            publish_live(&mut live_producer, &symbol, &new_candle).await?;
                            current_candle = Some(new_candle);
                        }

                        None => {
                            let candle = LiveCandle::new(&tick, tick_minute);
                            publish_live(&mut live_producer, &symbol, &candle).await?;
                            current_candle = Some(candle);
                        }
                    }
                }

                SymbolCommand::Shutdown => {
                    info!("Shutdown signal for symbol {}", symbol);
                    break;
                }
            }
        }

        info!("Symbol worker stopped for {}", symbol);
        Ok(())
    })
}

// ========================================================================================================
// Helpers
// ========================================================================================================

/// Backfill and initialize 1m candles for a given symbol.
/// Returns the timestamp (Unix ms) of the last closed candle.
pub async fn backfill_and_init(
    symbol: &str,
    db: &sqlx::Pool<sqlx::Postgres>,
    client: &dyn AnyClient,
) -> Result<i64> {
    info!("Backfill/init for {}", symbol);

    // 1. Get the last closed candle from the DB
    let last_close_time: Option<i64> = query_last_closed_1m(symbol, db).await?;

    // 2. Compute the backfill range in Unix milliseconds
    let start_ms: Option<i64> = last_close_time;
    let end_ms: i64 = Utc::now().timestamp_millis();

    // 3. Fetch candles from the client (Binance, etc.)
    let candles: Vec<Candle> = client
        .fetch_ohlcv_1m(symbol, start_ms, Some(end_ms), 100) // max 1000 per request
        .await?;

    if candles.is_empty() {
        warn!("No candles fetched for {}", symbol);
        // fallback: return last close if exists, otherwise current time
        return Ok(last_close_time.unwrap_or(end_ms));
    }

    info!("Fetched {} candles", candles.len());

    // 4. Persist candles in DB
    persist_candles_1m(symbol, &candles, db).await?;

    // 5. Return the timestamp of the last closed candle
    let last_close_ms: i64 = candles.last().expect("checked non-empty").close_time;

    Ok(last_close_ms)
}

async fn query_last_closed_1m(
    symbol: &str,
    db: &sqlx::Pool<sqlx::Postgres>,
) -> Result<Option<i64>> {
    let last_close: Option<i64> = sqlx::query_scalar(
        r#"
        SELECT close_time
        FROM ohlcv_1m
        WHERE symbol = $1
        ORDER BY close_time DESC
        LIMIT 1
        "#
    )
    .bind(symbol)
    .fetch_optional(db) 
    .await?;

    Ok(last_close)
}

async fn persist_candles_1m(
    symbol: &str,
    candles: &[Candle],
    db: &sqlx::Pool<sqlx::Postgres>,
) -> Result<()> {
    // INSERT ... ON CONFLICT DO NOTHING
    todo!()
}

async fn persist_closed(
    _db: &sqlx::Pool<sqlx::Postgres>,
    symbol: &str,
    candle: &LiveCandle,
) -> Result<()> {
    info!("Persist closed candle {} @ {}", symbol, candle.minute);
    Ok(())
}

async fn publish_live(
    producer: &mut producer::Producer<TokioExecutor>,
    symbol: &str,
    candle: &LiveCandle,
) -> Result<()> {
    let fut = producer.send_non_blocking(candle.clone()).await?;
    fut.await?;
    info!("Publish LIVE candle {} @ {}", symbol, candle.minute);
    Ok(())
}

async fn publish_closed(
    producer: &mut producer::Producer<TokioExecutor>,
    symbol: &str,
    candle: &LiveCandle,
) -> Result<()> {
    let fut = producer.send_non_blocking(candle.clone()).await?;
    fut.await?;
    info!("Publish CLOSED candle {} @ {}", symbol, candle.minute);
    Ok(())
}
