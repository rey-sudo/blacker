use crate::{master::state::AppState, server::router};
use anyhow::{Context, Result};
use axum::Router;
use tracing::info;

/// Starts the HTTP server.
pub async fn start_http_server(state: AppState) -> Result<()> {
    let app: Router = Router::new()
        .nest("/api/backtest", router::router())
        .with_state(state);

    let listener: tokio::net::TcpListener = tokio::net::TcpListener::bind("0.0.0.0:3002")
        .await
        .context("Failed to bind HTTP server to 0.0.0.0:3002")?;

    info!("Master HTTP server listening on 0.0.0.0:3002");

    axum::serve(listener, app)
        .await
        .context("HTTP server failed")?;

    Ok(())
}
