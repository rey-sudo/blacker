use crate::master::state::AppState;
use axum::{
    extract::{
        State,
        ws::{Message, WebSocket, WebSocketUpgrade},
    },
    response::Response,
};
use tracing::{debug, info, warn};

pub async fn websocket_handler(ws: WebSocketUpgrade, State(state): State<AppState>) -> Response {
    info!("WebSocket connection requested");

    ws.on_upgrade(move |socket| handle_socket(socket, state))
}

async fn handle_socket(mut socket: WebSocket, state: AppState) {
    info!("WebSocket client connected");

    let mut rx = state.master_state_tx.subscribe();

    loop {
        let payload = rx.borrow().clone();

        if let Err(err) = socket.send(Message::Text(payload.to_string().into())).await {
            debug!("WebSocket disconnected: {}", err);
            break;
        }

        if rx.changed().await.is_err() {
            warn!("master_state_tx closed");
            break;
        }
    }

    info!("WebSocket client disconnected");
}
