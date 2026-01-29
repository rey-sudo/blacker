use crate::application::state::{AppState, WsSender};
use crate::application::types::{ContextId, Symbol, Timeframe};
use futures_util::{SinkExt, StreamExt};
use serde_json::json;
use std::sync::Arc;
use tokio::net::TcpListener;
use tokio::sync::mpsc;
use tokio_tungstenite::accept_async;
use tokio_tungstenite::tungstenite::Message;
use tracing::info;

#[derive(serde::Deserialize)]
pub struct WsCommand {
    pub action: String,
    pub symbol: Option<Symbol>,
    pub timeframe: Option<Timeframe>,
    pub context_id: Option<ContextId>,
}

fn cleanup_ws(tx: WsSender, state: &AppState) {
    // 1. Remover de ws_registry (context_id -> sender)
    state
        .ws_registry
        .retain(|_, sender| !sender.same_channel(&tx));

    // 2. Remover de todas las subscripciones OHLCV
    for mut entry in state.ohlcv_subs.iter_mut() {
        entry.value_mut().retain(|sender| !sender.same_channel(&tx));
    }
}

// ---------- Start WS Server ----------
pub async fn start_ws_server(state: Arc<AppState>) {
    let listener = TcpListener::bind("0.0.0.0:3030").await.unwrap();
    info!("WebSocket server listening on 0.0.0.0:3030");

    while let Ok((stream, addr)) = listener.accept().await {
        let state = state.clone();
        tokio::spawn(async move {
            match accept_async(stream).await {
                Ok(ws_stream) => {
                    info!("New WS connection from {}", addr);
                    handle_ws_connection(ws_stream, state).await;
                }
                Err(e) => {
                    tracing::error!("Error during WS handshake: {:?}", e);
                }
            }
        });
    }
}

async fn handle_ws_connection(
    ws_stream: tokio_tungstenite::WebSocketStream<tokio::net::TcpStream>,
    state: Arc<AppState>,
) {
    let (mut ws_sender, mut ws_receiver) = ws_stream.split();
    let (tx, mut rx) = mpsc::channel::<Arc<serde_json::Value>>(100);

    // Task único dueño del WebSocket writer
    tokio::spawn(async move {
        while let Some(msg) = rx.recv().await {
            if let Ok(text) = serde_json::to_string(&*msg) {
                if ws_sender.send(Message::Text(text.into())).await.is_err() {
                    break;
                }
            }
        }
    });

    // Loop de lectura (comandos desde el cliente)
    while let Some(Ok(msg)) = ws_receiver.next().await {
        match msg {
            Message::Text(text) => match serde_json::from_str::<WsCommand>(&text) {
                Ok(cmd) => {
                    handle_ws_command(cmd, tx.clone(), state.clone()).await;
                }
                Err(e) => {
                    tracing::warn!("invalid ws command: {}", e);
                }
            },

            Message::Close(_) => {
                tracing::info!("ws closed by client");
                break;
            }

            Message::Ping(p) => {
                // tungstenite maneja pong automático si quieres
                tracing::debug!("ping {:?}", p);
            }

            _ => {}
        }
    }

    cleanup_ws(tx, &state);
}

async fn handle_ws_command(cmd: WsCommand, tx: WsSender, state: Arc<AppState>) {
    match cmd.action.as_str() {
        "open_chart" => {
            let context_id: ContextId = cmd.context_id.unwrap_or_else(|| ContextId::new());
            state.ws_registry.insert(context_id.clone(), tx.clone());

            if let (Some(symbol), Some(timeframe)) = (cmd.symbol.clone(), cmd.timeframe.clone()) {
                let key = (symbol, timeframe);
                state.ohlcv_subs.entry(key).or_default().push(tx.clone());
            }

            let msg = json!({
                "type": "chart_opened",
                "context_id": context_id,
            });
            let _ = tx.send(Arc::new(msg)).await;
        }

        "subscribe_ohlcv" => {
            if let (Some(symbol), Some(timeframe)) = (cmd.symbol, cmd.timeframe) {
                let key = (symbol, timeframe);
                state.ohlcv_subs.entry(key).or_default().push(tx.clone());
            }
        }

        "unsubscribe_ohlcv" => {
            if let (Some(symbol), Some(timeframe)) = (cmd.symbol, cmd.timeframe) {
                let key = (symbol, timeframe);
                if let Some(mut subs) = state.ohlcv_subs.get_mut(&key) {
                    subs.retain(|s| !s.same_channel(&tx));
                }
            }
        }

        _ => {
            tracing::warn!("Unknown WS command: {:?}", cmd.action);
        }
    }
}
