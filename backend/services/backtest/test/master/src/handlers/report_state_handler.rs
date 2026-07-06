use crate::{
    slave::SlaveState, state::{AppState, MasterState},
};
use axum::{Json, extract::State, http::StatusCode};
use std::time::Instant;
use tokio::sync::RwLockWriteGuard;
use tracing::info;
use serde::{Deserialize, Serialize};

#[derive(Deserialize)]
pub struct ReportRequest {
    pub id: String,
    pub status: String,
}

#[derive(Serialize)]
pub struct ReportResponse {
    pub ok: bool,
}

pub async fn report_state_handler(
    State(state): State<AppState>,
    Json(req): Json<ReportRequest>,
) -> (StatusCode, Json<ReportResponse>) {
    let mut master: RwLockWriteGuard<'_, MasterState> = state.master.write().await;

    master.slaves.insert(
        req.id,
        SlaveState {
            connected: true,
            status: req.status,
            last_seen: Instant::now(),
        },
    );

    info!(?master.slaves, "Estado actualizado");

    (StatusCode::OK, Json(ReportResponse { ok: true }))
}
