use crate::{common::MasterStatus, state::{AppState, MasterState, ReplayStatus}};
use axum::{extract::State, http::StatusCode};
use tokio::sync::RwLockWriteGuard;

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

    master.tick_index = 0;
    master.replay_status = ReplayStatus::Running;

    drop(master);

    state.replay_notify.notify_one();

    Ok(StatusCode::OK)
}