use crate::{master::state::{AppState, MasterState}, slaves::{engine::{Timeframe}}};
use axum::{Json, extract::State, http::StatusCode};
use serde::{Deserialize, Serialize};
use tokio::sync::RwLockWriteGuard;
use uuid::Uuid;

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
        master.config_hash = Uuid::now_v7().to_string();
        
        drop(master);
        
        let _ = state.publish_master_state().await;

        Response {
            ok: true
        }
    };

    (StatusCode::OK, Json(response))
}
