use crate::{master::state::{AppState, MasterState}, slaves::{engine::{Timeframe}}};
use axum::{Json, extract::State, http::StatusCode};
use serde::{Deserialize, Serialize};
use tokio::sync::RwLockWriteGuard;
use tracing::info;

#[derive(Debug, Deserialize)]
pub struct Request {
    pub timeframe: Timeframe,
}

#[derive(Serialize)]
pub struct Response {
    pub ok: bool
}

pub async fn add_timeframe_handler(
    State(state): State<AppState>,
    Json(req): Json<Request>,
) -> (StatusCode, Json<Response>) {
    let response: Response = {
        let mut master: RwLockWriteGuard<'_, MasterState> = state.master.write().await;

        master.engine_state.timeframes.insert(req.timeframe.id.clone(), req.timeframe);
        master.version += 1;
        
        drop(master);
        
        let _ = state.publish_master_state().await;

        Response {
            ok: true
        }
    };

    (StatusCode::OK, Json(response))
}
