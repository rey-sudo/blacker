use anyhow::Result;
use futures_util::StreamExt;
use serde::Deserialize;
use std::time::Duration;
use tokio_tungstenite::connect_async;
use tracing::{error, info};

/// =======================
/// CONSTANTES BINANCE
/// =======================

const BINANCE_WS_BASE: &str = "wss://stream.binance.com:9443/ws";
const MAX_BACKOFF_SECS: u64 = 30;

/// =======================
/// MODELO STREAM @aggTrade
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




pub async fn run(symbol: &str) -> Result<()> {
    let symbol = symbol.to_lowercase();
    let url = format!("{}/{}@aggTrade", BINANCE_WS_BASE, symbol);

    let mut attempt: u32 = 0;

    loop {
        info!("Connecting to Binance WS: {}", url);

        match connect_async(&url).await {
            Ok((ws_stream, _)) => {
                info!("Connected to Binance");
                attempt = 0;

                let (_, mut read) = ws_stream.split();

                while let Some(msg) = read.next().await {
                    match msg {
                        Ok(msg) if msg.is_text() => {
                            let text = msg.into_text()?;

                            match serde_json::from_str::<BinanceAggTrade>(&text) {
                                Ok(agg) => {
                                    // 👉 AQUÍ EMPIEZA TU PIPELINE REAL
                                    // Por ahora solo logueamos
                                    info!(
                                        "aggTrade | {} | price={} qty={} maker={}",
                                        agg.s, agg.p, agg.q, agg.m
                                    );
                                }
                                Err(e) => {
                                    error!("Parse error: {} | raw={}", e, text);
                                }
                            }
                        }
                        Ok(_) => {} // ping/pong u otros frames
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




async fn backoff(attempt: u32) {
    let secs = std::cmp::min(attempt as u64 * 2, MAX_BACKOFF_SECS);
    info!("Reconnecting in {}s...", secs);
    tokio::time::sleep(Duration::from_secs(secs)).await;
}
