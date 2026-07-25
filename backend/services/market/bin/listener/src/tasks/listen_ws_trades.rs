use crate::{models::Tick, sources::dydx::get_source_endpoint};
use anyhow::{Result, bail};
use async_channel::Sender;
use futures_util::{SinkExt, StreamExt, stream::SplitSink};
use tokio::{
    net::TcpStream,
    time::{Duration, sleep},
};
use tokio_tungstenite::{
    MaybeTlsStream, WebSocketStream, connect_async,
    tungstenite::{self, Message},
};
use tracing::info;
use tungstenite::Error;

const MARKET: &str = "BTC-USD";

//----------------------------------------------------
// LOGIC
// ---------------------------------------------------

pub fn parse_dydx_trade(text: &str) -> Result<Vec<Tick>> {
    let message: WsMessage = serde_json::from_str(text)?;

    if message.msg_type != "channel_data" {
        return Ok(Vec::new());
    }

    let symbol = match message.id {
        Some(s) => s,
        None => return Ok(Vec::new()),
    };

    let trades = match message.contents.and_then(|c| c.trades) {
        Some(t) => t,
        None => return Ok(Vec::new()),
    };

    let mut ticks = Vec::with_capacity(trades.len());

    for trade in trades {
        ticks.push(Tick {
            source: "dydx".to_string(),
            symbol: symbol.clone(),
            price: trade.price.parse()?,
            quantity: trade.size.parse()?,
            event_time: trade.created_at.timestamp_millis(),
        });
    }

    Ok(ticks)
}

async fn send_initial_messages(
    source: &str,
    write: &mut SplitSink<WebSocketStream<MaybeTlsStream<TcpStream>>, Message>,
) -> Result<(), Error> {
    match source {
        "dydx" => {
            let subscribe: serde_json::Value = serde_json::json!({
                "type": "subscribe",
                "channel": "v4_trades",
                "id": MARKET
            });

            write
                .send(Message::Text(subscribe.to_string().into()))
                .await?;
        }

        _ => panic!("Unsupported source : {}", source),
    }

    Ok(())
}

pub fn parse_trade(source: &str, text: &str) -> Result<Vec<Tick>> {
    match source {
        "dydx" => parse_dydx_trade(text),
        _ => bail!("Unsupported source: {}", source),
    }
}

async fn run_connection(tx: Sender<Vec<Tick>>) -> Result<()> {
    let source: &str = "dydx";

    let source_url: &str = get_source_endpoint(source);

    info!("Connecting to source {source}");

    let (ws_stream, _) = connect_async(source_url).await?;
    let (mut write, mut read) = ws_stream.split();

    info!("Connected to source {source}");

    send_initial_messages(source, &mut write).await?;

    println!("Subscribed to {}", MARKET);

    while let Some(msg) = read.next().await {
        let msg: Message = msg?;

        match msg {
            Message::Text(text) => {
                let ticks: Vec<Tick> = parse_trade(source, &text)?;

                if !ticks.is_empty() {
                    tx.send(ticks).await?;
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
