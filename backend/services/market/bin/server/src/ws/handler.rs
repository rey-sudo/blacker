use axum::{
    extract::ws::{WebSocket, WebSocketUpgrade},
    response::Response,
};

pub async fn ws_handler(
    ws: WebSocketUpgrade,
) -> Response {

    ws.on_upgrade(handle_socket)
}

async fn handle_socket(
    mut socket: WebSocket,
) {

    while let Some(Ok(msg)) = socket.recv().await {

        println!("Mensaje recibido: {:?}", msg);

        let _ = socket
            .send(msg)
            .await;
    }
}