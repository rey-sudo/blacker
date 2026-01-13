use anyhow::{Result, anyhow};
use futures_util::StreamExt;
use serde::Deserialize;
use std::time::Duration;
use tokio::sync::mpsc::Sender;
use tokio_tungstenite::connect_async;
use tracing::{error, info};
use std::time::{SystemTime, UNIX_EPOCH};

use crate::clients::client::Client;
use crate::common::event::{EventType, OutEvent};
use crate::common::tick::{Side, Tick};

const BINANCE_WS_BASE: &str = "wss://stream.binance.com:9443/stream";
const MAX_BACKOFF_SECS: u64 = 30;

/// =======================
/// SINGLE AGG TRADE STRUCT
/// =======================
#[derive(Debug, Deserialize)]
#[allow(non_snake_case)]
struct BinanceAggTrade {
    e: String, // event type
    E: i64,    // event time
    s: String, // symbol
    a: u64,    // aggregate trade id
    p: String, // price
    q: String, // quantity
    f: u64,    // first trade id
    l: u64,    // last trade id
    T: i64,    // trade time
    m: bool,   // buyer is market maker
    M: bool,   // best price match
}

impl TryFrom<BinanceAggTrade> for Tick {
    type Error = anyhow::Error;

    fn try_from(agg: BinanceAggTrade) -> Result<Self> {
        let price: f64 = agg
            .p
            .parse()
            .map_err(|e| anyhow!("invalid price '{}': {}", agg.p, e))?;

        let quantity: f64 = agg
            .q
            .parse()
            .map_err(|e| anyhow!("invalid quantity '{}': {}", agg.q, e))?;

        let side: Side = if agg.m { Side::Sell } else { Side::Buy };

        Ok(Tick {
            exchange: Client::Binance,
            symbol: agg.s,
            price,
            quantity,
            side,
            ts: agg.T,
        })
    }
}

/// =======================
/// MULTI-STREAM STRUCT
/// =======================
#[derive(Debug, Deserialize)]
struct BinanceMultiAggTrade {
    stream: String,
    data: BinanceAggTrade,
}

/// =======================
/// BINANCE WS CLIENT (MULTI-SYMBOL)
/// =======================
pub async fn run(symbols: Vec<String>, tx: Sender<OutEvent>) -> Result<()> {
    if symbols.is_empty() {
        return Err(anyhow!("No symbols provided to Binance WS client"));
    }

    // Build multi-stream URL
    let streams = symbols
        .into_iter()
        .map(|s| s.to_lowercase() + "@aggTrade")
        .collect::<Vec<String>>()
        .join("/");

    let url = format!("{}?streams={}", BINANCE_WS_BASE, streams);

    let mut attempt: u32 = 0;

    loop {
        info!("Connecting to Binance WS: {}", url);

        match connect_async(&url).await {
            Ok((ws_stream, _)) => {
                info!("Connected to Binance WS for symbols: {}", streams);
                attempt = 0;

                let (_, mut read) = ws_stream.split();

                while let Some(msg) = read.next().await {
                    match msg {
                        Ok(msg) if msg.is_text() => {
                            let now: i64 =
                                SystemTime::now().duration_since(UNIX_EPOCH)?.as_millis() as i64;

                            let text = match msg.into_text() {
                                Ok(t) => t,
                                Err(e) => {
                                    error!("WS text error: {}", e);
                                    continue;
                                }
                            };

                            // Deserialize multi-stream wrapper
                            let multi: BinanceMultiAggTrade = match serde_json::from_str(&text) {
                                Ok(m) => m,
                                Err(e) => {
                                    error!("Parse error: {} | raw={}", e, text);
                                    continue;
                                }
                            };

                            // Convert inner data → Tick
                            let tick: Tick = match Tick::try_from(multi.data) {
                                Ok(t) => t,
                                Err(e) => {
                                    error!("Tick conversion error: {}", e);
                                    continue;
                                }
                            };

                            // Debug logging
                            info!(
                                "TICK | {:?} | {} | price={} qty={} side={:?}",
                                tick.exchange, tick.symbol, tick.price, tick.quantity, tick.side
                            );

                            // Convert Tick → OutEvent
                            let payload = match serde_json::to_vec(&tick) {
                                Ok(p) => p,
                                Err(e) => {
                                    error!("Failed to serialize tick: {}", e);
                                    continue;
                                }
                            };

                            let event: OutEvent = OutEvent {
                                symbol: tick.symbol.clone(),
                                payload,
                                event_time: tick.ts,
                                event_type: EventType::Tick,
                                received_at: now,
                            };

                            if let Err(e) = tx.send(event).await {
                                error!("Channel closed, stopping Binance client: {}", e);
                                return Ok(());
                            }
                        }

                        Ok(_) => {
                            // ping/pong/binary frames ignored
                        }

                        Err(e) => {
                            error!("WebSocket read error: {}", e);
                            break;
                        }
                    }
                }
            }

            Err(e) => {
                error!("Failed to connect to Binance WS: {}", e);
            }
        }

        attempt += 1;
        backoff(attempt).await;
    }
}

/// =======================
/// SIMPLE BACKOFF
/// =======================
async fn backoff(attempt: u32) {
    let secs = std::cmp::min(attempt as u64 * 2, MAX_BACKOFF_SECS);
    info!("Reconnecting in {}s...", secs);
    tokio::time::sleep(Duration::from_secs(secs)).await;
}
