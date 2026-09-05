use crate::master::state::{AppState, MasterState};
use axum::{Json, extract::State};
use serde::Serialize;
use tokio::sync::RwLockReadGuard;

#[derive(Debug, Serialize)]
pub struct Response {
    pub boot_id: String,
    pub master: MasterState,
}

pub async fn get_state_handler(State(state): State<AppState>) -> Json<Response> {
    let master: RwLockReadGuard<'_, MasterState> = state.master.read().await;

    Json(Response {
        boot_id: state.boot_id.clone(),
        master: master.clone(),
    })
}
