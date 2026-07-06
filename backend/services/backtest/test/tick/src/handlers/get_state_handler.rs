use crate::state::{AppState, MasterState};
use axum::{Json, extract::State};
use tokio::sync::RwLockReadGuard;

pub async fn get_state_handler(State(state): State<AppState>) -> Json<MasterState> {
    let master: RwLockReadGuard<'_, MasterState> = state.master.read().await;
    
    Json(master.clone())
}
