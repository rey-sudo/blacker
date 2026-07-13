use crate::{
    common::SlaveId,
    master::state::{AppState, MasterState, MasterStatus},
    slaves::{engine::EngineState, slave::ConnectedSlaveState},
};
use axum::{Json, extract::State, http::StatusCode};
use serde::{Deserialize, Serialize};
use std::time::Instant;
use tokio::sync::RwLockWriteGuard;

#[derive(Deserialize)]
pub struct ReportRequest {
    pub id: SlaveId,
    pub status: String,
}

#[derive(Serialize)]
pub struct ReportResponse {
    pub ok: bool,
    pub boot_id: String,
    pub master: MasterStatus,
    pub engine_state: Option<EngineState>,
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
                last_seen: Instant::now(),
            },
        );

        ReportResponse {
            ok: true,
            boot_id: state.boot_id.clone(),
            master: master.status.clone(),
            engine_state: master.engine_state.clone(),
        }
    };

    (StatusCode::OK, Json(response))
}
