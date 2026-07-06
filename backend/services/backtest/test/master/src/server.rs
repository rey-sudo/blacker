use crate::{routes, state::AppState};
use axum::Router;
use tracing::info;

pub async fn start_http_server(state: AppState) {
    let app: Router = Router::new().merge(routes::router()).with_state(state);

    let listener: tokio::net::TcpListener =
        tokio::net::TcpListener::bind("0.0.0.0:3000").await.unwrap();

    info!("Master listening in :3000");

    axum::serve(listener, app).await.unwrap();
}
