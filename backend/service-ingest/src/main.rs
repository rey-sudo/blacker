/*
 * BLACKER
 * Copyright (C) 2024  Juan José Caballero Rey
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

 
mod config;
mod clients;
mod common;

use anyhow::{anyhow, Result};
use config::Config;
use dotenvy::from_filename;
use tokio::task::JoinHandle;
use tracing::info;
use rustls::crypto::ring;

use pulsar::{Pulsar, TokioExecutor};

#[tokio::main]
async fn main() -> Result<()> {
    from_filename(".env.local").ok();

    ring::default_provider()
        .install_default()
        .expect("failed to install rustls crypto provider");

    tracing_subscriber::fmt::init();

    let config:Config = Config::from_env()?;

    info!("Starting ingest service");
    info!("Client: {}", config.client_id);
    info!("Symbols: {:?}", config.symbols);

    let pulsar: Pulsar<_> =
        Pulsar::builder(&config.pulsar_url, TokioExecutor)
            .build()
            .await?;


    let producer = pulsar
        .producer()
        .with_topic("persistent://public/market-data/ticks")
        .with_name("service-ingest")
        .build()
        .await?;


    let mut handles: Vec<JoinHandle<Result<()>>> = Vec::new();

    match config.client_id.as_str() {
        "binance" => {
            for symbol in &config.symbols {
                let s = symbol.clone();

                let handler = tokio::spawn(async move {
                    clients::binance::run(&s).await
                }); 
                
                handles.push(handler);
            }
        }
        other => {
            return Err(anyhow!(
                "Unknown CLIENT_ID '{}'. Supported: binance",
                other
            ));
        }
    }


    for handle in handles {
        handle.await??;
    }

    Ok(())
}