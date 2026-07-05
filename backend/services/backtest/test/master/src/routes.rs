use crate::state::{AppState, SlaveStatus};
use axum::{Json, Router, extract::State, http::StatusCode, routing::post};
use serde::{Deserialize, Serialize};
use std::time::Instant;

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
    Router::new().route("/report", post(report))
}

async fn report(
    State(state): State<AppState>,
    Json(req): Json<ReportRequest>,
) -> (StatusCode, Json<ReportResponse>) {
    let mut slaves = state.slaves.write().await;

    slaves.insert(
        req.id,
        SlaveStatus {
            connected: true,
            last_seen: Instant::now(),
            status: req.status,
        },
    );

    (StatusCode::OK, Json(ReportResponse { ok: true }))
}
