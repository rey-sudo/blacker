use crate::master::state::{AppState, MasterState, ReplayStatus};
use axum::{extract::State, http::StatusCode};
use tokio::sync::RwLockWriteGuard;
use tracing::info;

pub async fn stop_backtest_handler(
    State(state): State<AppState>,
) -> Result<StatusCode, StatusCode> {
    let mut master: RwLockWriteGuard<'_, MasterState> = state.master.write().await;

    if master.replay_status != ReplayStatus::Running {
        return Err(StatusCode::CONFLICT);
    }

    master.replay_status = ReplayStatus::Stopped;

    drop(master);

    let _ = state.publish_master_state().await;

    info!("Backtest stopped.");

    Ok(StatusCode::OK)
}
