use crate::master::state::{AppState, MasterState, ReplayStatus};
use axum::{extract::State, http::StatusCode};
use tokio::sync::RwLockWriteGuard;

pub async fn stop_backtest_handler(
    State(state): State<AppState>,
) -> Result<StatusCode, StatusCode> {
    let mut master: RwLockWriteGuard<'_, MasterState> = state.master.write().await;

    if master.replay_status != ReplayStatus::Running {
        return Err(StatusCode::CONFLICT);
    }

    master.replay_status = ReplayStatus::Stopped;

    drop(master);

    Ok(StatusCode::OK)
}