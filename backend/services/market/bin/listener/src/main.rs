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
use async_channel;
use listener::{
    models::{Tick, TickBatch},
    tasks::{batch_dispatcher, listen_source_ws},
};
use rustls::crypto::ring;
use tokio::task::JoinSet;

#[tokio::main]
async fn main() -> Result<()> {
    tracing_subscriber::fmt::init();

    ring::default_provider()
        .install_default()
        .expect("Failed to install rustls crypto provider");

    let (tick_tx, tick_rx) = async_channel::bounded::<Vec<Tick>>(100_000);

    let (batch_tx, batch_rx) = async_channel::bounded::<Vec<Tick>>(200);

    let mut tasks: JoinSet<std::prelude::v1::Result<(), anyhow::Error>> = JoinSet::new();

    let source: &str = "dydx";

    tasks.spawn(listen_source_ws::run(tick_tx.clone(), source.into()));

    tasks.spawn(batch_dispatcher::run(tick_rx, batch_tx));

    while let Some(result) = tasks.join_next().await {
        match result {
            Ok(Ok(())) => {}

            Ok(Err(err)) => {
                eprintln!("Task error: {err:?}");
            }

            Err(err) => {
                eprintln!("Join error: {err:?}");
            }
        }
    }

    Ok(())
}
