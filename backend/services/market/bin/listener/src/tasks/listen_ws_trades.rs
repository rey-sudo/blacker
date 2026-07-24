use anyhow::{Context, Result};
use async_channel::Sender;
use futures_util::{SinkExt, StreamExt};
use tokio::time::{sleep, Duration};
use tokio_tungstenite::{connect_async, tungstenite::Message};
use crate::models::Tick;

const WS_URL: &str = "wss://indexer.dydx.trade/v4/ws";
const MARKET: &str = "ETH-USD";

pub async fn run(tx: Sender<Tick>) -> Result<()> {
    loop {
        match run_connection(tx.clone()).await {
            Ok(_) => {
                println!("WebSocket disconnected");
            }
            Err(err) => {
                eprintln!("WebSocket error: {err:?}");
            }
        }

        println!("Reconnecting in 1 second...");
        sleep(Duration::from_secs(1)).await;
    }
}

async fn run_connection(tx: Sender<Tick>) -> Result<()> {
    println!("Connecting to {WS_URL}");

    let (ws_stream, _) = connect_async(WS_URL).await?;

    println!("Connected");

    let (mut write, mut read) = ws_stream.split();

    let subscribe = serde_json::json!({
        "type": "subscribe",
        "channel": "v4_trades",
        "id": MARKET
    });

    write
        .send(Message::Text(subscribe.to_string().into()))
        .await?;

    println!("Subscribed to {}", MARKET);

    while let Some(msg) = read.next().await {
        let msg = msg?;

        match msg {
            Message::Text(text) => {
                println!("{text}");

                // Aquí luego llamaremos al parser:
                //
                // if let Some(tick) = parse_trade(&text)? {
                //     tx.send(tick).await?;
                // }
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