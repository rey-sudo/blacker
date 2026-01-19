use anyhow::Result;
use chrono::{DateTime, TimeZone, Timelike, Utc};
use pulsar::{producer, Pulsar, SerializeMessage, TokioExecutor, Error as PulsarError};
use tokio::{
    sync::mpsc,
    task::JoinHandle,
};
use tracing::{info, warn};

use crate::{
    common::tick::Tick, config::Config, infrastructure::database::Database,
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
        let payload = serde_json::to_vec(&candle)
            .map_err(|e| PulsarError::Custom(e.to_string()))?;
        Ok(producer::Message {
            payload,
            ..Default::default()
        })
    }
}

/// Convierte unix millis a DateTime<Utc> y trunca a minuto
fn ts_to_minute(ts_millis: i64) -> DateTime<Utc> {
    let dt = Utc.timestamp_millis_opt(ts_millis)
        .single()
        .expect("invalid tick timestamp");

    dt.with_second(0).unwrap()
      .with_nanosecond(0).unwrap()
}

/// Spawn a dedicated worker task for a symbol
pub fn spawn_symbol_worker(
    symbol: String,
    mut rx: mpsc::Receiver<SymbolCommand>,
    db: Database,
    pulsar: Pulsar<TokioExecutor>,
    _config: Config,
) -> JoinHandle<Result<()>> {
    tokio::spawn(async move {
        info!("Symbol worker started for {}", symbol);

        // ────────────────
        // 1. Backfill + initialization
        // ────────────────
        let _last_closed_minute = backfill_and_init(&symbol, &db.pool()).await?;

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

// ────────────────────────────────
// Helpers
// ────────────────────────────────

async fn backfill_and_init(
    symbol: &str,
    db: &sqlx::Pool<sqlx::Postgres>,
) -> Result<DateTime<Utc>> {
    // 1. Query last closed 1m candle from DB
    // 2. If missing → fetch from external provider
    // 3. Persist ohlcv_1m history
    // 4. Return last closed minute
    info!("Backfill/init for {}", symbol);
    Ok(Utc::now())
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
