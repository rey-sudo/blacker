use crate::{routes, master::state::AppState};
use axum::Router;
use tracing::info;

pub async fn start_http_server(state: AppState) {
    let app: Router = Router::new()
    .nest("/api/backtest", routes::router())
    .with_state(state);

    let listener: tokio::net::TcpListener =
        tokio::net::TcpListener::bind("0.0.0.0:3002").await.unwrap();

    info!("Master listening in :3002");

    axum::serve(listener, app).await.unwrap();
}
