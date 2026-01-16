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

use anyhow::{Result, anyhow};
use config::Config;
use dotenvy::from_filename;
use pulsar::{Consumer, Pulsar, SubType, TokioExecutor};
use rustls::crypto::ring;
use tokio::task::JoinHandle;
use tracing::{info, warn};

use crate::common::tick::Tick;

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
    //
    // The consumer subscribes to the `market-data/ticks` topic using a
    // `KeyShared` subscription, ensuring strict ordering of messages
    // per symbol while allowing horizontal scaling across multiple service pods.
    //
    // All pods share the same subscription name (`service-ingest-truth`), while each consumer is assigned a unique
    // name derived from the runtime configuration (POD_NAME) to improve observability.
    let mut consumer: Consumer<Tick, _> = pulsar
        .consumer()
        .with_topic("persistent://public/market-data/ticks")
        .with_subscription("service-ingest-truth")
        .with_subscription_type(SubType::KeyShared)
        .with_consumer_name(&config.consumer_name)
        .build()
        .await?;

    Ok(())
}
