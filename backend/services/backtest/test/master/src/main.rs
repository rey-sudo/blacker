use axum::{Router, routing::get};
use master::app::App;
use master::websocket::{self, SharedApp};
use std::sync::Arc;
use tokio::sync::RwLock;

#[tokio::main]
async fn main() {
    let app_state: SharedApp = Arc::new(RwLock::new(App::new()));

    let app: Router = Router::new()
        .route("/ws", get(websocket::ws_handler))
        .with_state(app_state);

    let listener: tokio::net::TcpListener = tokio::net::TcpListener::bind("0.0.0.0:3000")
        .await
        .expect("No se pudo abrir el puerto 3000");

    println!("=================================");
    println!(" Master iniciado");
    println!(" Escuchando en ws://0.0.0.0:3000/ws");
    println!("=================================");

    axum::serve(listener, app)
        .await
        .expect("Error del servidor");
}
