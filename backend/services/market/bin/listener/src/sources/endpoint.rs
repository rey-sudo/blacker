use crate::{models::Tick, sources::dydx::parse_dydx_trade};
use anyhow::{Result, bail};
use futures_util::{SinkExt, stream::SplitSink};
use tokio::net::TcpStream;
use tokio_tungstenite::{
    MaybeTlsStream, WebSocketStream,
    tungstenite::{self, Message},
};
use tungstenite::Error;

pub fn get_source_endpoint(source: &str) -> &'static str {
    match source {
        "dydx" => "wss://indexer.dydx.trade/v4/ws",
        _ => panic!("Source not found: {}", source),
    }
}

pub async fn prepare_source_endpoint(
    source: &str,
    symbol: &str,
    write: &mut SplitSink<WebSocketStream<MaybeTlsStream<TcpStream>>, Message>,
) -> Result<(), Error> {
    match source {
        "dydx" => {
            let subscribe: serde_json::Value = serde_json::json!({
                "type": "subscribe",
                "channel": "v4_trades",
                "id": symbol
            });

            write
                .send(Message::Text(subscribe.to_string().into()))
                .await?;
        }

        _ => panic!("Unsupported source : {}", source),
    }

    Ok(())
}

pub fn parse_source_trade(source: &str, text: &str) -> Result<Vec<Tick>> {
    match source {
        "dydx" => parse_dydx_trade(text),
        _ => bail!("Unsupported source: {}", source),
    }
}
