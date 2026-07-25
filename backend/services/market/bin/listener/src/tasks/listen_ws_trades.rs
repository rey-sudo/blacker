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

use crate::{
    models::Tick,
    sources::endpoint::{get_source_endpoint, parse_source_trade, prepare_source_endpoint},
};
use anyhow::Result;
use async_channel::Sender;
use futures_util::{SinkExt, StreamExt};
use tokio::time::{Duration, sleep};
use tokio_tungstenite::{connect_async, tungstenite::Message};
use tracing::info;

// ---------------------------------------------------------------------------------------------------------------------
// LISTEN WS SOURCES LOGIC
// ---------------------------------------------------------------------------------------------------------------------

const MARKET: &str = "BTC-USD";

async fn run_connection(tx: Sender<Vec<Tick>>) -> Result<()> {
    let source: &str = "dydx";

    let source_url: &str = get_source_endpoint(source);

    info!("Connecting to source {source}");

    let (ws_stream, _) = connect_async(source_url).await?;
    let (mut write, mut read) = ws_stream.split();

    info!("Connected to source {source}");

    prepare_source_endpoint(source, MARKET, &mut write).await?;

    println!("Subscribed to {}", MARKET);

    while let Some(msg) = read.next().await {
        let msg: Message = msg?;

        match msg {
            Message::Text(text) => {
                let ticks: Vec<Tick> = parse_source_trade(source, &text)?;

                if !ticks.is_empty() {
                    tx.send(ticks).await?;
                    info!("tick send");
                }
            }
            Message::Ping(payload) => {
                write.send(Message::Pong(payload)).await?;
            }

            Message::Pong(_) => {}

            Message::Binary(_) => {}

            Message::Close(frame) => {
                println!("Closed: {:?}", frame);
                break;
            }

            _ => {}
        }
    }

    Ok(())
}

pub async fn run(tx: Sender<Vec<Tick>>) -> Result<()> {
    loop {
        match run_connection(tx.clone()).await {
            Ok(_) => {
                info!("WebSocket disconnected");
            }
            Err(err) => {
                info!("WebSocket error: {err:?}");
            }
        }

        info!("Reconnecting in 1 second...");
        sleep(Duration::from_secs(1)).await;
    }
}
