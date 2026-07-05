use crate::state::{AppState, SlaveState};
use axum::{Json, Router, extract::State, http::StatusCode, routing::post};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::time::Instant;
use tokio::sync::RwLockWriteGuard;
use tracing::info;

#[derive(Deserialize)]
pub struct ReportRequest {
    pub id: String,
    pub status: String,
}

#[derive(Serialize)]
pub struct ReportResponse {
    pub ok: bool,
}

pub fn router() -> Router<AppState> {
    Router::new().route("/report-state", post(report_state_handler))
}

async fn report_state_handler(
    State(state): State<AppState>,
    Json(req): Json<ReportRequest>,
) -> (StatusCode, Json<ReportResponse>) {
    let mut slaves: RwLockWriteGuard<'_, HashMap<String, SlaveState>> = state.slaves.write().await;

    slaves.insert(
        req.id,
        SlaveState {
            connected: true,
            status: req.status,
            last_seen: Instant::now(),
        },
    );

    info!(?slaves, "Estado actualizado");

    (StatusCode::OK, Json(ReportResponse { ok: true }))
}
