use axum::{Router, routing::get};
use master::websocket::{ServerState, SharedState, ws_handler};
use std::{net::SocketAddr, sync::Arc};
use tokio::sync::RwLock;

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt::init();

    let app_state: SharedState = Arc::new(RwLock::new(ServerState::default()));

    let app: Router = Router::new()
        .route("/ws", get(ws_handler))
        .with_state(app_state);

    let addr: SocketAddr = SocketAddr::from(([0, 0, 0, 0], 3000));

    println!("Listening on {}", addr);

    let listener: tokio::net::TcpListener = tokio::net::TcpListener::bind(addr).await.unwrap();

    axum::serve(listener, app).await.unwrap();
}
