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
use anyhow::Result;
use cursor_db::binary::BinaryFile;
use master::config::AppConfig;
use master::master::state::AppState;
use master::server::server::start_http_server;
use master::snapshot::{ReplaySnapshot, load_snapshot};
use master::tasks::{engine_consumer, replay_task};
use pulsar::{Pulsar, TokioExecutor};
use std::sync::Arc;
use tokio::task::JoinSet;
use tracing::{error, info};

#[tokio::main]
async fn main() -> Result<()> {
    dotenvy::dotenv().ok();

    tracing_subscriber::fmt::init();

    let config: AppConfig = AppConfig::from_env()?;

    let pulsar: Arc<Pulsar<TokioExecutor>> = Arc::new(
        Pulsar::builder("pulsar://localhost:6650", TokioExecutor)
            .with_outbound_channel_size(1000)
            .build()
            .await
            .expect("Invalid Pulsar URL"),
    );

    let tick_data: Arc<BinaryFile> = Arc::new(BinaryFile::open("./input/binance_ticks.bin")?);

    let snapshot: Option<ReplaySnapshot> = load_snapshot().await?;

    let state: AppState = AppState::new(tick_data, snapshot);

    let mut tasks: JoinSet<Result<(), anyhow::Error>> = JoinSet::new();

    tasks.spawn(replay_task::run(state.clone(), pulsar.clone()));
    tasks.spawn(engine_consumer::run(state.clone(), pulsar.clone()));
    tasks.spawn(start_http_server(state));

    while let Some(result) = tasks.join_next().await {
        match result {
            Ok(Ok(())) => {
                info!("Task finished");
            }
            Ok(Err(error)) => {
                error!(%error, "Task failed");
                std::process::exit(1);
            }
            Err(error) => {
                error!(%error, "Task panicked");
                std::process::exit(1);
            }
        }
    }

    Ok(())
}
