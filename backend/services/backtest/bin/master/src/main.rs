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

use cursor_db::binary::BinaryFile;
use master::master::state::AppState;
use master::server::start_http_server;
use master::snapshot::{ReplaySnapshot, load_snapshot};
use master::tasks::{master_monitor, replay_task, slave_monitor, engine_consumer};
use pulsar::{Pulsar, TokioExecutor};
use std::sync::Arc;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    tracing_subscriber::fmt::init();

    let pulsar: Arc<Pulsar<TokioExecutor>> = Arc::new(
        Pulsar::builder("pulsar://localhost:6650", TokioExecutor)
            .with_outbound_channel_size(1000)
            .build()
            .await
            .expect("Invalid Pulsar URL"),
    );

    let tick_data: Arc<BinaryFile> = Arc::new(BinaryFile::open("./input/ticks.bin")?);

    let snapshot: Option<ReplaySnapshot> = load_snapshot().await?;

    let state: AppState = AppState::new(tick_data, snapshot);

    master_monitor::run(state.clone());

    slave_monitor::run(state.clone());

    replay_task::run(state.clone(), pulsar.clone());

    engine_consumer::run(state.clone(), pulsar.clone());

    // start_execution_state_consumer();

    start_http_server(state).await;

    Ok(())
}
