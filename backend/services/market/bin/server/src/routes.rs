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
    handlers::{get_history, test},
    state::AppState,
    ws::handler::ws_handler,
};
use axum::{Router, routing::{get, post}};

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/get-history", post(get_history::handler))
        .route("/test", get(test::handler))
        .route("/ws", get(ws_handler))
}
