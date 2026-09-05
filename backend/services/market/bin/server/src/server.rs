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

use crate::{routes, state::AppState};
use axum::Router;
use tracing::info;

pub async fn start_http_server(state: AppState) {
    let app: Router = Router::new()
    .nest("/api/market", routes::router()).with_state(state);

    let listener: tokio::net::TcpListener =
        tokio::net::TcpListener::bind("0.0.0.0:3001").await.unwrap();

    info!("Master listening in :3001");

    axum::serve(listener, app).await.unwrap();
}
