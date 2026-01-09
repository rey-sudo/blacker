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
use pulsar::{Pulsar, TokioExecutor};
use rustls::crypto::ring;
use tokio::task::JoinHandle;
use tracing::info;

use crate::{clients::client::Client, common::event::OutEvent};

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

    info!("Starting ingest service");
    info!("Client: {:?}", config.client_id);
    info!("Symbols: {:?}", config.symbols);

    // Initializes the Apache Pulsar client using the Tokio runtime.
    // - Uses the builder pattern to configure the broker URL and async executor
    // - Establishes the connection asynchronously
    // - Fails fast if the connection to the broker cannot be established
    let pulsar: Pulsar<_> = Pulsar::builder(&config.pulsar_url, TokioExecutor)
        .build()
        .await?;

    // Creates a Pulsar producer responsible for publishing market data events.
    // - Binds the producer to the `persistent://public/market-data/ticks` topic
    // - Assigns a logical producer name for observability and debugging
    // - Builds the producer asynchronously using the existing Pulsar client
    // - Fails fast if the producer cannot be created
    let mut producer: pulsar::Producer<TokioExecutor> = pulsar
        .producer()
        .with_topic("persistent://public/market-data/ticks")
        .with_name("service-ingest")
        .build()
        .await?;

    // Creates an in-memory asynchronous channel to decouple data ingestion from Pulsar publishing.
    // - `tx` is cloned and shared across producer tasks (one per data source / symbol)
    // - `rx` is owned by a single writer task that serializes events into Pulsar
    // - The bounded capacity (100_000) provides backpressure if Pulsar becomes slow
    // - Prevents WebSocket clients from blocking on I/O to the message broker
    let (tx, mut rx) = tokio::sync::mpsc::channel::<OutEvent>(100_000);

    let writer: JoinHandle<std::result::Result<(), anyhow::Error>> = tokio::spawn(async move {
        while let Some(event) = rx.recv().await {
            info!("Sending tick: {:?}", event.symbol);

            let send_future = producer
                .send_non_blocking(event)
                .await
                .map_err(|e| anyhow!("Failed to create send future: {:?}", e))?;
            let msg_id = send_future
                .await
                .map_err(|e| anyhow!("Failed to send tick to Pulsar: {:?}", e))?;

            info!("Tick sent to Pulsar with id {:?}", msg_id);
        }

        Ok::<(), anyhow::Error>(())
    });

    //--------------------------------------------------------------------------------------------

    let mut handles: Vec<JoinHandle<std::result::Result<(), anyhow::Error>>> = Vec::new();

    match config.client_id {
        Client::Binance => {
            for symbol in &config.symbols {
                let sym: String = symbol.clone();
                let tx_clone = tx.clone();

                let handler =
                    tokio::spawn(async move { clients::binance::run(&sym, tx_clone).await });

                handles.push(handler);
            }
        }

        Client::Databento => {}
    }

    drop(tx);

    for h in handles {
        h.await??;
    }

    writer.await??;

    Ok(())
}
