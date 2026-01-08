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

mod clients;
mod common;
mod config;

use anyhow::{Result, anyhow};
use config::Config;
use dotenvy::from_filename;
use rustls::crypto::ring;
use tokio::task::JoinHandle;
use tracing::info;

use pulsar::{Pulsar, TokioExecutor};

use crate::common::event::OutEvent;


#[tokio::main]
async fn main() -> Result<()> {
    from_filename(".env.local").ok();

    ring::default_provider()
        .install_default()
        .expect("failed to install rustls crypto provider");

    tracing_subscriber::fmt::init();

    let config: Config = Config::from_env()?;

    info!("Starting ingest service");
    info!("Client: {}", config.client_id);
    info!("Symbols: {:?}", config.symbols);

    let pulsar: Pulsar<_> = Pulsar::builder(&config.pulsar_url, TokioExecutor)
        .build()
        .await?;

    let mut producer = pulsar
        .producer()
        .with_topic("persistent://public/market-data/ticks")
        .with_name("service-ingest")
        .build()
        .await?;

    let (tx, mut rx) = tokio::sync::mpsc::channel::<OutEvent>(100_000);

    let writer: JoinHandle<std::result::Result<(), anyhow::Error>> = tokio::spawn(async move {
        while let Some(event) = rx.recv().await {
            info!("Sending tick to Pulsar: {:?}", event.symbol);

            producer
                .send_non_blocking(event)
                .await?
                .await
                .map_err(|e| anyhow!("Pulsar send failed: {:?}", e))?;
        }
        Ok::<(), anyhow::Error>(())
    });

    //--------------------------------------------------------------------------------------------
    
    let mut handles: Vec<JoinHandle<std::result::Result<(), anyhow::Error>>> = Vec::new();

    match config.client_id.as_str() {
        "binance" => {
            for symbol in &config.symbols {
                let sym: String = symbol.clone();
                let tx_clone = tx.clone(); 

                let handler = tokio::spawn(async move { clients::binance::run(&sym, tx_clone).await });

                handles.push(handler);
            }
        }

        "databento" => {}

        other => {
            return Err(anyhow!("Unknown CLIENT_ID '{}'. Supported: binance", other));
        }
    }

    drop(tx);

    for h in handles {
        h.await??;
    }

    writer.await??;

    Ok(())
}
