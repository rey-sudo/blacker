/*
 * BLACKER
 * Copyright (C) 2026  Juan José Caballero Rey
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

use anyhow::{Result, anyhow};
use futures_util::StreamExt;
use serde::Deserialize;
use std::time::Duration;
use std::time::{SystemTime, UNIX_EPOCH};
use tokio::sync::mpsc::Sender;
use tokio_tungstenite::connect_async;
use tracing::{error, info};


use crate::application::clients::client::Client;
use crate::common::event::{EventType, OutEvent};
use crate::common::tick::{Side, Tick};

const BINANCE_WS_BASE: &str = "wss://stream.binance.com:9443/stream";
const MAX_BACKOFF_SECS: u64 = 30;

#[derive(Debug, Deserialize)]
#[allow(non_snake_case)]
#[allow(dead_code)]
struct BinanceAggTrade {
    /// event type
    e: String,
    /// event time
    E: i64,
    /// symbol
    s: String,
    /// aggregate trade id
    a: u64,
    /// price
    p: String,
    /// quantity
    q: String,
    /// first trade id
    f: u64,
    /// last trade id
    l: u64,
    /// trade time
    T: i64,
    /// buyer is market maker
    m: bool,
    /// best price match
    M: bool,
}

/// Converts a Binance `@aggTrade` WebSocket payload into the internal `Tick` domain model.
///
/// Responsibilities:
/// - Parse numeric fields (`price`, `quantity`) from their string representation
/// - Derive trade side based on Binance's `m` flag (buyer is market maker)
/// - Map Binance-specific fields into a normalized `Tick` structure
/// - Preserve the original trade timestamp (`T`) for event-time processing
///
/// Error handling:
/// - Fails if numeric parsing of `price` or `quantity` is invalid
/// - Uses `anyhow::Error` to provide rich error context for upstream logging
///
/// Notes:
/// - `exchange` is hardcoded to `Client::Binance` as this converter is exchange-specific
/// - Fields not required for the internal model (e.g. aggregate IDs) are intentionally ignored
/// - This conversion is deterministic and side-effect free
impl TryFrom<BinanceAggTrade> for Tick {
    type Error = anyhow::Error;

    fn try_from(agg: BinanceAggTrade) -> Result<Self> {
        // Parse price from string to f64
        let price: f64 = agg
            .p
            .parse()
            .map_err(|e: std::num::ParseFloatError| anyhow!("invalid price '{}': {}", agg.p, e))?;

        // Parse quantity from string to f64
        let quantity: f64 = agg.q.parse().map_err(|e: std::num::ParseFloatError| {
            anyhow!("invalid quantity '{}': {}", agg.q, e)
        })?;

        // Derive trade side:
        // - m = true  → buyer is market maker → aggressive seller
        // - m = false → aggressive buyer
        let side: Side = if agg.m { Side::Sell } else { Side::Buy };

        Ok(Tick {
            exchange: Client::Binance,
            symbol: agg.s,
            price,
            quantity,
            side,
            ts: agg.T, //Trade timestamp
        })
    }
}

/// =======================
/// MULTI-STREAM STRUCT
/// =======================
#[derive(Debug, Deserialize)]
#[allow(dead_code)]
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
    let streams: String = symbols
        .into_iter()
        .map(|s: String| s.to_lowercase() + "@aggTrade")
        .collect::<Vec<String>>()
        .join("/");

    let url: String = format!("{}?streams={}", BINANCE_WS_BASE, streams);

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

                            let text: tungstenite::Utf8Bytes = match msg.into_text() {
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

                            // Convert Tick → OutEvent
                            let payload: Vec<u8> = match serde_json::to_vec(&tick) {
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
    let secs: u64 = std::cmp::min(attempt as u64 * 2, MAX_BACKOFF_SECS);
    info!("Reconnecting in {}s...", secs);
    tokio::time::sleep(Duration::from_secs(secs)).await;
}
