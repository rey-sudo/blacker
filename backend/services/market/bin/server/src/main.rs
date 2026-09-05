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

use std::sync::Arc;

use anyhow::Result;
use clickhouse::Client;
use pulsar::{Pulsar, TokioExecutor};
use server::{server::start_http_server, state::AppState};
use tracing_subscriber;

#[tokio::main]
async fn main() -> Result<()> {
    tracing_subscriber::fmt::init();

    let db: Client = Client::default()
        .with_url("http://localhost:8123")
        .with_database("app")
        .with_user("app")
        .with_password("app123");

    db.query("SELECT 1").execute().await?;

    let pulsar: Arc<Pulsar<TokioExecutor>> = Arc::new(
        Pulsar::builder("pulsar://localhost:6650", TokioExecutor)
            .build()
            .await
            .expect("Invalid Pulsar URL"),
    );

    let state: AppState = AppState::new(db, pulsar);

    start_http_server(state).await;

    Ok(())
}
