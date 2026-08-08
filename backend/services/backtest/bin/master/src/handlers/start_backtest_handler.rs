use crate::master::state::{AppState, MasterState, MasterStatus, ReplayStatus};
use axum::{extract::State, http::StatusCode};
use tokio::sync::RwLockWriteGuard;
use tracing::info;

pub async fn start_backtest_handler(
    State(state): State<AppState>,
) -> Result<StatusCode, StatusCode> {
    let mut master: RwLockWriteGuard<'_, MasterState> = state.master.write().await;

    if master.status != MasterStatus::Ready {
        return Err(StatusCode::PRECONDITION_FAILED);
    }

    if master.replay_status != ReplayStatus::Stopped {
        return Err(StatusCode::CONFLICT);
    }

    master.replay_status = ReplayStatus::Running;

    drop(master);

    let _ = state.publish_master_state().await;

    info!("Backtest running.");

    Ok(StatusCode::OK)
}
