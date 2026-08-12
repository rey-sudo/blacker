use crate::master::state::AppState;
use axum::{
    extract::{
        State,
        ws::{Message, WebSocket, WebSocketUpgrade},
    },
    response::Response,
};
use std::sync::Arc;
use tokio::sync::watch::Receiver;
use tracing::{debug, info, warn};

pub async fn websocket_handler(ws: WebSocketUpgrade, State(state): State<AppState>) -> Response {
    info!("WebSocket connection requested");

    ws.on_upgrade(move |socket: WebSocket| handle_socket(socket, state))
}

async fn handle_socket(mut socket: WebSocket, state: AppState) {
    info!("WebSocket client connected");

    let mut rx: Receiver<Arc<String>> = state.master_state_tx.subscribe();

    state.publish_master_state().await;

    loop {
        if rx.changed().await.is_err() {
            warn!("master_state_tx closed");
            break;
        }

        let payload: Arc<String> = rx.borrow_and_update().clone();

        if let Err(err) = socket
            .send(Message::Text(payload.to_string().into()))
            .await
        {
            debug!("WebSocket disconnected: {}", err);
            break;
        }
    }

    info!("WebSocket client disconnected");
}