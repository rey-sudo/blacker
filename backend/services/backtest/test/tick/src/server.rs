use crate::{routes, state::AppState};
use axum::Router;

pub async fn start_http_server(state: AppState) {
    let app: Router = Router::new().merge(routes::router()).with_state(state);

    let listener: tokio::net::TcpListener =
        tokio::net::TcpListener::bind("0.0.0.0:3001").await.unwrap();

    println!("Tick escuchando en :3001");

    axum::serve(listener, app).await.unwrap();
}
