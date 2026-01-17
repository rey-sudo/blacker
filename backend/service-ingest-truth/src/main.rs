/*
 * BLACKER
 * Copyright (C) 2026  Juan José Caballero Rey
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

mod clients;
mod common;

use std::collections::HashMap;

use anyhow::{Result, anyhow};

use futures_util::TryStreamExt;
use pulsar::consumer::Message;

use tokio::{select, sync::mpsc, task::JoinHandle};
use tracing::{info, warn};

use service_ingest_truth::{
    application::symbol_worker::{SymbolCommand, spawn_symbol_worker},
    common::tick::Tick,
    config::Config,
    infrastructure::{
        bootstrap,
        database::{self, Database},
        pulsar::{PulsarClient, tick_consumer::TickConsumer},
    },
};

#[tokio::main]
async fn main() -> Result<()> {
    bootstrap::run()?;

    let config: Config = bootstrap::get_config()?;

    let db: Database = Database::new(&config.database_url).await?;

    database::bootstrap::checklist(&db).await?;

    let pulsar_client: PulsarClient = PulsarClient::new(&config.pulsar_url).await?;

    let mut tick_consumer: TickConsumer =
        TickConsumer::new(&pulsar_client.inner(), &config.consumer_name).await?;

    // Map of active symbol workers.
    // Each symbol is associated with a dedicated mpsc channel used
    // to route ticks to its corresponding worker task.
    let mut workers: HashMap<String, mpsc::Sender<SymbolCommand>> = HashMap::new();

    // Join handles for all spawned symbol workers, used to ensure
    // a graceful shutdown and proper error propagation.
    let mut worker_handles: Vec<JoinHandle<Result<()>>> = Vec::new();

    info!("Waiting for ticks...");

    loop {
        select! {
            result = tick_consumer.inner_mut().try_next() => {
                let maybe_msg: Option<Message<Tick>> = result?;

                let Some(msg) = maybe_msg else {
                    warn!("Pulsar stream closed");
                    break;
                };

                let tick = match msg.deserialize() {
                    Ok(t) => t,
                    Err(e) => {
                        warn!("Failed to deserialize tick: {:?}", e);
                        tick_consumer.inner_mut().ack(&msg).await?;
                        continue;
                    }
                };

                let symbol = tick.symbol.clone();

                let sender = if let Some(tx) = workers.get(&symbol) {
                    tx.clone()
                } else {
                    if workers.len() >= config.max_symbols {
                        warn!("MAX_SYMBOLS reached, dropping tick for {}", symbol);
                        tick_consumer.inner_mut().ack(&msg).await?;
                        continue;
                    }

                    info!("Initializing symbol {}", symbol);

                    let (tx, rx) = mpsc::channel(1024);

                    let handle = spawn_symbol_worker(
                        symbol.clone(),
                        rx,
                        db.pool().clone(),
                        pulsar_client.inner().clone(),
                        config.clone(),
                    );

                    workers.insert(symbol.clone(), tx.clone());
                    worker_handles.push(handle);

                    tx
                };

                if sender.send(SymbolCommand::Tick(tick)).await.is_err() {
                    warn!("Worker for {} dropped, removing", symbol);
                    workers.remove(&symbol);
                }

                tick_consumer.inner_mut().ack(&msg).await?;
            }

            _ = tokio::signal::ctrl_c() => {
                info!("Shutdown signal received");
                break;
            }
        }
    }

    info!("Shutting down symbol workers");

    // Notify workers
    for (_, tx) in workers {
        let _ = tx.send(SymbolCommand::Shutdown).await;
    }

    // Await workers
    for handle in worker_handles {
        if let Err(e) = handle.await? {
            warn!("Worker exited with error: {:?}", e);
        }
    }

    info!("service-ingest-truth stopped cleanly");
    Ok(())
}
