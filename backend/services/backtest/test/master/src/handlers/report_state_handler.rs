use crate::{
    common::SlaveId, slaves::slave::ConnectedSlaveState, state::{AppState, MasterState, MasterStatus},
};
use axum::{Json, extract::State, http::StatusCode};
use serde::{Deserialize, Serialize};
use std::time::Instant;
use tokio::sync::RwLockWriteGuard;

#[derive(Deserialize)]
pub struct ReportRequest {
    pub id: SlaveId,
    pub status: String
}

#[derive(Serialize)]
pub struct ReportResponse {
    pub ok: bool,
    pub master: MasterStatus
}

pub async fn report_state_handler(
    State(state): State<AppState>,
    Json(req): Json<ReportRequest>,
) -> (StatusCode, Json<ReportResponse>) {
    let response: ReportResponse = {
        let mut master: RwLockWriteGuard<'_, MasterState> = state.master.write().await;

        master.slaves.insert(
            req.id.clone(),
            ConnectedSlaveState {
                id: req.id,
                connected: true,
                status: req.status,
                last_seen: Instant::now()
            },
        );

        ReportResponse {
            ok: true,
            master: master.status.clone()
        }
    };

    (StatusCode::OK, Json(response))
}
