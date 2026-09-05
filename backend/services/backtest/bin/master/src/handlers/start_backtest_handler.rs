// BLACKER
// Copyright (C) 2026 Juan José Caballero Rey
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation version 3 of the License.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program. If not, see <https://www.gnu.org/licenses/>.

use crate::master::state::{AppState, MasterState, MasterStatus, ReplayStatus};
use axum::{Json, extract::State, http::StatusCode};
use serde::{Deserialize, Serialize};
use tokio::sync::RwLockWriteGuard;
use tracing::info;

/// Body of the request.
#[derive(Debug, Deserialize)]
pub struct Request {}

/// Response of the request.
#[derive(Serialize)]
pub struct Response {
    pub success: bool,
    pub message: String,
}

/// Start the backtest handler.
pub async fn start_backtest_handler(
    State(state): State<AppState>,
    Json(req): Json<Request>,
) -> (StatusCode, Json<Response>) {
    let mut master: RwLockWriteGuard<'_, MasterState> = state.master.write().await;

    if master.status != MasterStatus::Ready {
        return (
            StatusCode::PRECONDITION_FAILED,
            Json(Response {
                success: false,
                message: "Master is not ready.".to_string(),
            }),
        );
    }

    if master.replay_status != ReplayStatus::Stopped {
        return (
            StatusCode::CONFLICT,
            Json(Response {
                success: false,
                message: "Replay is not stopped.".to_string(),
            }),
        );
    }

    if master.engine_state.timeframes.is_empty() {
        return (
            StatusCode::CONFLICT,
            Json(Response {
                success: false,
                message: "At least one timeframe is required.".to_string(),
            }),
        );
    }

    master.replay_status = ReplayStatus::Running;

    drop(master);

    let _ = state.publish_master_state().await;

    info!("Replay is running.");

    (
        StatusCode::OK,
        Json(Response {
            success: true,
            message: "The backtest has started.".to_string(),
        }),
    )
}
