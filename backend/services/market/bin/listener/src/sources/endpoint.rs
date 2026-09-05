// BLACKER
// Copyright (C) 2026 Juan José Caballero Rey
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation version 3 of the License.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program. If not, see <https://www.gnu.org/licenses/>.

use crate::{models::Tick, sources::{binance::parse_binance_trade, dydx::parse_dydx_trade}};
use anyhow::Result;
use futures_util::{SinkExt, stream::SplitSink};
use tokio::net::TcpStream;
use tokio_tungstenite::{
    MaybeTlsStream, WebSocketStream,
    tungstenite::{self, Message},
};
use tracing::error;
use tungstenite::Error;

/// Returns the WebSocket endpoint for the given data source.
/// Kill the process if the source does not exist.
pub fn get_source_endpoint(source: &str) -> &'static str {
    match source {
        "dydx" => "wss://indexer.dydx.trade/v4/ws",
        "binance" => "wss://fstream.binance.com/ws",
        _ => {
            error!("Source not found: {}", source);
            std::process::exit(1);
        }
    }
}

/// Sends the subscription message required to initialize the WebSocket
/// connection for the specified market data source.
/// Kill the process if the source does not exist.
pub async fn prepare_source_endpoint(
    source: &str,
    symbols: &str,
    write: &mut SplitSink<WebSocketStream<MaybeTlsStream<TcpStream>>, Message>,
) -> Result<(), Error> {
    match source {
        "dydx" => {
            for symbol in symbols
                .split(',')
                .map(str::trim)
                .filter(|s: &&str| !s.is_empty())
            {
                let subscribe: serde_json::Value = serde_json::json!({
                    "type": "subscribe",
                    "channel": "v4_trades",
                    "id": symbol
                });

                write
                    .send(Message::Text(subscribe.to_string().into()))
                    .await?;
            }
        }

        "binance" => {
            for (id, symbol) in symbols
                .split(',')
                .map(str::trim)
                .filter(|s| !s.is_empty())
                .enumerate()
            {
                let subscribe: serde_json::Value = serde_json::json!({
                    "method": "SUBSCRIBE",
                    "params": [
                        format!("{}@trade", symbol.to_lowercase())
                    ],
                    "id": id
                });

                write
                    .send(Message::Text(subscribe.to_string().into()))
                    .await?;
            }
        }

        _ => {
            error!("Unsupported source: {}", source);
            std::process::exit(1);
        }
    }

    Ok(())
}

/// Parses a trade message from the specified source into one or more `Tick` values.
/// Kill the process if the source does not exist.
pub fn parse_source_trade(source: &str, text: &str) -> Result<Vec<Tick>> {
    match source {
        "dydx" => parse_dydx_trade(text),
        "binance" => parse_binance_trade(text),
        _ => {
            error!("Unsupported source: {}", source);
            std::process::exit(1);
        }
    }
}
