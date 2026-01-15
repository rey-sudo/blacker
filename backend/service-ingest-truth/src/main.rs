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
use pulsar::{Pulsar, TokioExecutor};
use rustls::crypto::ring;
use tokio::task::JoinHandle;
use tracing::{info, warn};

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

    // ------------------------------------------------------------
    // 3. Init database (Postgres)
    // ------------------------------------------------------------
    let db: sqlx::Pool<_> = database::client::connect(&config.database_url).await?;

    database::bootstrap::checklist(&db).await?;

    info!("Connected to Postgres");

    Ok(())
}
