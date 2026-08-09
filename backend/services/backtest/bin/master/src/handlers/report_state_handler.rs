use crate::{
    common::SlaveId,
    master::state::{AppState, MasterState},
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
    pub initialized: bool,
}

#[derive(Serialize)]
pub struct ReportResponse {
    pub ok: bool,
    pub boot_id: String,
    pub engine_state: Option<EngineState>,
}

pub async fn report_state_handler(
    State(state): State<AppState>,
    Json(req): Json<ReportRequest>,
) -> (StatusCode, Json<ReportResponse>) {
    let response: ReportResponse = {
        let mut master: RwLockWriteGuard<'_, MasterState> = state.master.write().await;

        master.connected_slaves.insert(
            req.id.clone(),
            ConnectedSlaveState {
                id: req.id,
                connected: true,
                status: req.status,
                last_seen: Instant::now(),
            },
        );

        let engine_state: Option<EngineState> = if !req.initialized {
            master.engine_state.clone()
        } else {
            None
        };

        ReportResponse {
            ok: true,
            boot_id: state.boot_id.clone(),
            engine_state
        }
    };

    (StatusCode::OK, Json(response))
}
