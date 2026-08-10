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
pub struct Request {
    pub id: SlaveId,
    pub status: String,
    pub initialized: bool,
}

#[derive(Serialize)]
pub struct Response {
    pub ok: bool,
    pub boot_id: String,
    pub version: usize,
    pub engine_state: EngineState,
}

pub async fn report_state_handler(
    State(state): State<AppState>,
    Json(req): Json<Request>,
) -> (StatusCode, Json<Response>) {
    let response: Response = {
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

        Response {
            ok: true,
            boot_id: state.boot_id.clone(),
            version: master.version.clone(),
            engine_state: master.engine_state.clone(),
        }
    };

    (StatusCode::OK, Json(response))
}
