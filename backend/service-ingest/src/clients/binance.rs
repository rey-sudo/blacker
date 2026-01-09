use anyhow::{Result, anyhow};
use futures_util::StreamExt;
use serde::Deserialize;
use std::time::Duration;
use tokio::sync::mpsc::Sender;
use tokio_tungstenite::connect_async;
use tracing::{error, info};

use crate::clients::client::Client;
use crate::common::event::OutEvent;
use crate::common::tick::{Side, Tick};

/// =======================
/// CONSTANTES BINANCE
/// =======================

const BINANCE_WS_BASE: &str = "wss://stream.binance.com:9443/ws";
const MAX_BACKOFF_SECS: u64 = 30;

/// =======================
/// STREAM @aggTrade
/// =======================

#[derive(Debug, Deserialize)]
#[allow(non_snake_case)]
#[allow(dead_code)]
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

        let side = if agg.m { Side::Sell } else { Side::Buy };

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
/// CLIENTE BINANCE WS
/// =======================

pub async fn run(symbol: String, tx: Sender<OutEvent>) -> Result<()> {
    let symbol = symbol.to_lowercase();
    let url = format!("{}/{}@aggTrade", BINANCE_WS_BASE, symbol);

    let mut attempt: u32 = 0;

    loop {
        info!("Connecting to Binance WS: {}", url);

        match connect_async(&url).await {
            Ok((ws_stream, _)) => {
                info!("Connected to Binance [{}]", symbol);
                attempt = 0;

                let (_, mut read) = ws_stream.split();

                while let Some(msg) = read.next().await {
                    match msg {
                        Ok(msg) if msg.is_text() => {
                            let text = match msg.into_text() {
                                Ok(t) => t,
                                Err(e) => {
                                    error!("WS text error: {}", e);
                                    continue;
                                }
                            };

                            let agg = match serde_json::from_str::<BinanceAggTrade>(&text) {
                                Ok(a) => a,
                                Err(e) => {
                                    error!("Parse error: {} | raw={}", e, text);
                                    continue;
                                }
                            };

                            let tick = match Tick::try_from(agg) {
                                Ok(t) => t,
                                Err(e) => {
                                    error!("Tick conversion error: {}", e);
                                    continue;
                                }
                            };

                            info!(
                                "TICK | {:?} | {} | price={} qty={} side={:?}",
                                tick.exchange, tick.symbol, tick.price, tick.quantity, tick.side
                            );

                            // 🔑 Convertir Tick → OutEvent
                            let payload = match serde_json::to_vec(&tick) {
                                Ok(p) => p,
                                Err(e) => {
                                    error!("Failed to serialize tick: {}", e);
                                    continue;
                                }
                            };

                            let event = OutEvent {
                                symbol: tick.symbol.clone(),
                                payload,
                                event_time: tick.ts,
                            };

                            if let Err(e) = tx.send(event).await {
                                error!("Channel closed, stopping Binance client: {}", e);
                                return Ok(());
                            }
                        }

                        Ok(_) => {
                            // ping / pong / binary frames ignorados
                        }

                        Err(e) => {
                            error!("WebSocket read error: {}", e);
                            break;
                        }
                    }
                }
            }

            Err(e) => {
                error!("Failed to connect to Binance: {}", e);
            }
        }

        attempt += 1;
        backoff(attempt).await;
    }
}

/// =======================
/// BACKOFF SIMPLE
/// =======================

async fn backoff(attempt: u32) {
    let secs = std::cmp::min(attempt as u64 * 2, MAX_BACKOFF_SECS);
    info!("Reconnecting in {}s...", secs);
    tokio::time::sleep(Duration::from_secs(secs)).await;
}
