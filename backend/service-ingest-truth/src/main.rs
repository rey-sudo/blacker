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
mod config;
mod database;
mod symbol_worker;

use std::collections::HashMap;

use anyhow::{Result, anyhow};
use config::Config;
use dotenvy::from_filename;
use pulsar::{Consumer, Pulsar, SubType, TokioExecutor};
use rustls::crypto::ring;
use tokio::{sync::mpsc, task::JoinHandle};
use tracing::{info, warn};

use crate::{common::tick::Tick, symbol_worker::SymbolCommand};

#[tokio::main]
async fn main() -> Result<()> {
    from_filename(".env.local").ok();

    // Initialize rustls crypto backend (ring).
    // Required for all TLS connections (WebSockets, HTTPS, Pulsar).
    ring::default_provider()
        .install_default()
        .expect("failed to install rustls crypto provider");

    // Initialize tracing subscriber for structured, async-safe logging.
    // Enables info!, warn!, error! logs across the entire service.
    tracing_subscriber::fmt::init();

    //Env vars Config instance
    let config: Config = Config::from_env()?;

    info!("Starting service-ingest-truth");
    info!(
        "Shards {:?} / {} | MAX_SYMBOLS={}",
        config.shard_ids, config.total_shards, config.max_symbols
    );

    // Creates the database connection pool.
    let db: sqlx::Pool<_> = database::client::connect(&config.database_url).await?;

    database::bootstrap::checklist(&db).await?;

    info!("Connected to Postgres");

    // Initializes the Apache Pulsar client using the Tokio runtime.
    // - Uses the builder pattern to configure the broker URL and async executor
    // - Establishes the connection asynchronously
    // - Fails fast if the connection to the broker cannot be established
    let pulsar: Pulsar<_> = Pulsar::builder(&config.pulsar_url, TokioExecutor)
        .build()
        .await?;

    // Configures the Pulsar consumer used to receive the market ticks produced by `service-ingest`.
    // All pods share the same subscription name (`service-ingest-truth`); Each consumer is
    // assigned a unique name derived from (POD_NAME) for observability only.

    // The consumer subscribes to the `market-data/ticks` topic using a
    // Key_Shared subscriptions allow multiple consumers to share the same
    // subscription while guaranteeing strict ordering per message key.
    // All messages with the same key are always delivered to the same
    // consumer, even in case of redelivery.
    let mut consumer: Consumer<Tick, _> = pulsar
        .consumer()
        .with_topic("persistent://public/market-data/ticks")
        .with_subscription("service-ingest-truth")
        .with_subscription_type(SubType::KeyShared)
        .with_consumer_name(&config.consumer_name)
        .build()
        .await?;

    // Map of active symbol workers.
    // Each symbol is associated with a dedicated mpsc channel used
    // to route ticks to its corresponding worker task.
    let mut workers: HashMap<String, mpsc::Sender<SymbolCommand>> = HashMap::new();

    // Join handles for all spawned symbol workers, used to ensure
    // a graceful shutdown and proper error propagation.
    let mut worker_handles: Vec<JoinHandle<Result<()>>> = Vec::new();

    Ok(())
}
