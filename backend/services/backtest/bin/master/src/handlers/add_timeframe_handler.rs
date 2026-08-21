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

use crate::{
    master::state::{AppState, MasterState, ReplayStatus},
    slaves::engine::Timeframe,
    tasks::ReplayStep,
};
use axum::{Json, extract::State, http::StatusCode};
use serde::{Deserialize, Serialize};
use tokio::sync::RwLockWriteGuard;
use uuid::Uuid;

/// Request payload for adding a new timeframe.
#[derive(Debug, Deserialize)]
pub struct Request {
    pub timeframe: Timeframe,
}

/// Response returned after attempting to add a timeframe.
#[derive(Serialize)]
pub struct Response {
    pub success: bool,
    pub message: String,
}

/// Adds a new timeframe to the master engine_state.
pub async fn add_timeframe_handler(
    State(state): State<AppState>,
    Json(req): Json<Request>,
) -> (StatusCode, Json<Response>) {
    let mut master: RwLockWriteGuard<'_, MasterState> = state.master.write().await;

    if master.replay_status != ReplayStatus::Stopped {
        return (
            StatusCode::CONFLICT,
            Json(Response {
                success: false,
                message: "Cannot add timeframe while replay is running.".to_string(),
            }),
        );
    }

    if master.replay_step == ReplayStep::PublishTick {
        return (
            StatusCode::CONFLICT,
            Json(Response {
                success: false,
                message: "Cannot add timeframe while publishing tick.".to_string(),
            }),
        );
    }

    if master
        .engine_state
        .timeframes
        .contains_key(&req.timeframe.id)
    {
        return (
            StatusCode::CONFLICT,
            Json(Response {
                success: false,
                message: "The specified timeframe already exists.".to_string(),
            }),
        );
    }

    master
        .engine_state
        .timeframes
        .insert(req.timeframe.id.clone(), req.timeframe);

    master.config_id = Uuid::now_v7().to_string();

    drop(master);

    let _ = state.publish_master_state().await;

    (
        StatusCode::CREATED,
        Json(Response {
            success: true,
            message: "Timeframe added successfully.".to_string(),
        }),
    )
}
