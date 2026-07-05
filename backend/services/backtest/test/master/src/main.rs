use axum::{
    Router,
    extract::ws::{WebSocket, WebSocketUpgrade},
    response::IntoResponse,
    routing::get,
};
use axum::extract::ws::Message;
use futures_util::{SinkExt, StreamExt};
use master::common::Packet;

#[tokio::main]
async fn main() {
    let app: Router = Router::new().route("/ws", get(ws_handler));

    let listener: tokio::net::TcpListener =
        tokio::net::TcpListener::bind("0.0.0.0:3000").await.unwrap();

    println!("Master escuchando en puerto 3000");

    axum::serve(listener, app).await.unwrap();
}

async fn ws_handler(ws: WebSocketUpgrade) -> impl IntoResponse {
    ws.on_upgrade(handle_socket)
}

async fn handle_socket(mut socket: WebSocket) {
    println!("Nuevo slave conectado");

    while let Some(Ok(msg)) = socket.next().await {
        match msg {
            Message::Text(text) => {
                match serde_json::from_str::<Packet>(&text) {
                    Ok(packet) => {
                        println!("{packet:?}");

                        match packet {
                            Packet::Hello { id } => {
                                println!("Slave identificado: {}", id);
                            }
                        }
                    }

                    Err(err) => {
                        println!("Error parseando Packet: {}", err);
                    }
                }
            }

            _ => {}
        }
    }

    println!("Slave desconectado");
}