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

#[derive(Debug, Deserialize)]
pub struct Request {
    pub timeframe: Timeframe,
}

#[derive(Serialize)]
pub struct Response {
    pub ok: bool,
}

pub async fn add_timeframe_handler(
    State(state): State<AppState>,
    Json(req): Json<Request>,
) -> (StatusCode, Json<Response>) {
    //TODO: validate Timeframe params

    let mut master: RwLockWriteGuard<'_, MasterState> = state.master.write().await;

    if master.replay_status == ReplayStatus::Running
        && master.replay_step == ReplayStep::PublishTick
    {
        return (StatusCode::CONFLICT, Json(Response { ok: false }));
    }

    if master
        .engine_state
        .timeframes
        .contains_key(&req.timeframe.id)
    {
        return (StatusCode::CONFLICT, Json(Response { ok: false }));
    }

    master
        .engine_state
        .timeframes
        .insert(req.timeframe.id.clone(), req.timeframe);

    master.config_id = Uuid::now_v7().to_string();

    drop(master);

    let _ = state.publish_master_state().await;

    (StatusCode::CREATED, Json(Response { ok: true }))
}
