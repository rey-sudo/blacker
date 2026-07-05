use crate::handle_ack::handle_ack;
use crate::handle_command::handle_command;
use crate::protocol::{ClientMessage, PendingCommand};
use crate::register_client::register_client;
use axum::extract::ws::{Message, WebSocket};
use axum::{
    extract::{State, ws::WebSocketUpgrade},
    response::IntoResponse,
};
use futures::stream::SplitSink;
use futures::{SinkExt, StreamExt};
use tracing::error;
use std::{collections::HashMap, sync::Arc};
use tokio::sync::RwLock;
use tokio::sync::mpsc;
use tokio::task::JoinHandle;

#[derive(Default)]
pub struct ServerState {
    pub admin: Option<mpsc::Sender<Message>>,
    pub slaves: HashMap<String, mpsc::Sender<Message>>,
    pub pending: HashMap<String, PendingCommand>,
}

pub type SharedState = Arc<RwLock<ServerState>>;

pub fn spawn_ws_writer(
    mut ws_tx: SplitSink<WebSocket, Message>,
    mut rx: mpsc::Receiver<Message>,
) -> JoinHandle<()> {
    tokio::spawn(async move {
        while let Some(msg) = rx.recv().await {
            if ws_tx.send(msg).await.is_err() {
                // conexión cerrada → salir del loop
                break;
            }
        }
    })
}

async fn process_message(
    text: String,
    sender: mpsc::Sender<Message>,
    state: SharedState,
) -> anyhow::Result<()> {
    let msg: ClientMessage = serde_json::from_str(&text)?;

    let mut client_id: Option<String> = None;

    match msg {
        ClientMessage::Hello(hello) => {
            let id: String = register_client(hello, sender.clone(), state.clone()).await?;
            client_id = Some(id);
        }

        ClientMessage::Command(cmd) => {
            handle_command(cmd, state).await?;
        }

        ClientMessage::Ack(ack) => {
            handle_ack(ack, client_id.clone(), state).await?;
        }
    }

    Ok(())
}

pub async fn handle_socket(socket: WebSocket, state: SharedState) -> anyhow::Result<()> {
    let (mut ws_tx, mut ws_rx) = socket.split();

    let (tx, mut rx) = mpsc::channel::<Message>(100);

    // Writer
    let _writer_handle: JoinHandle<()> = spawn_ws_writer(ws_tx, rx);

    // Reader
    while let Some(Ok(msg)) = ws_rx.next().await {
        match msg {
            Message::Text(text) => {
                process_message(text.to_string(), tx.clone(), state.clone()).await?;
            }

            Message::Close(_) => break,

            _ => {}
        }
    }

    Ok(())
}

pub async fn ws_handler(
    ws: WebSocketUpgrade,
    State(state): State<SharedState>,
) -> impl IntoResponse {
    ws.on_upgrade(move |socket: WebSocket| async move {
        if let Err(err) = handle_socket(socket, state).await {
            error!("websocket error: {err}");
        }
    })
}
