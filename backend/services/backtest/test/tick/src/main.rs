use futures_util::SinkExt;
use tick::common::Packet;
use tokio_tungstenite::{connect_async, tungstenite::Message};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {

    let url: &str = "ws://127.0.0.1:3000/ws";

    println!("Conectando...");

    let (mut socket, _) = connect_async(url).await?;

    println!("Conectado.");

    let packet = Packet::Hello {
        id: "slave1".to_string(),
    };

    let json = serde_json::to_string(&packet)?;

    socket.send(Message::Text(json.into())).await?;

    println!("Hello enviado.");

    loop {
        tokio::time::sleep(std::time::Duration::from_secs(1)).await;
    }
}