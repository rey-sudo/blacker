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
use tracing::{info, warn};

use crate::{
    clients::client::Client,
    common::{
        event::{EventType, OutEvent},
        sharding::belongs_to_shard,
    },
};

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

    // Computes the list of symbols owned by this pod.
    // A symbol is considered owned if it deterministically maps to at least one
    // of the shard IDs assigned to this pod.
    //
    // Ownership is computed using a consistent hash function, ensuring that:
    // - Each symbol is assigned to exactly one logical shard
    // - Shard ownership is deterministic across all replicas
    // - Symbol distribution remains stable as long as TOTAL_SHARDS is unchanged
    //
    // The resulting owned_symbols list defines the effective workload of this pod.
    let owned_symbols: Vec<String> = config
        .symbols
        .iter()
        .cloned()
        .filter(|sym: &String| {
            config
                .shard_ids
                .iter()
                .any(|&sid| belongs_to_shard(sym, sid, config.total_shards))
        })
        .collect();

    if owned_symbols.is_empty() {
        warn!("No symbols assigned to this pod");
        return Ok(());
    }

    info!("Starting ingest service");
    info!("Client: {:?}", config.client_id);
    info!(
        "Owned symbols ({}): {:?}",
        owned_symbols.len(),
        owned_symbols
    );

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
    let mut producer_ticks: pulsar::Producer<TokioExecutor> = pulsar
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

    // Spawn a dedicated asynchronous task responsible for writing events to Apache Pulsar.
    //
    // This task acts as the single producer writer:
    // - It continuously consumes OutEvent messages from the Tokio MPSC receiver (rx)
    // - It serializes and sends each event to Pulsar impl SerializeMessage
    // - It provides backpressure automatically via the bounded channel 100_000
    // - It isolates Pulsar I/O from websocket ingestion logic
    //
    // Design:
    // - Decouples market data ingestion from Pulsar network latency
    // - Ensures ordered delivery per producer instance
    // - Centralizes error handling and logging for Pulsar writes
    // - Makes shutdown deterministic (task exits when all senders are dropped)
    //
    // Execution flow:
    // 1. Waits asynchronously for the next event from rx
    // 2. Calls send_non_blocking() to enqueue the message in Pulsar's internal buffer
    // 3. Awaits the broker acknowledgment to guarantee persistence
    // 4. Logs the returned MessageId for traceability
    //
    // The task exits gracefully when:
    // - All Sender handles (tx) are dropped
    // - rx.recv() returns None
    let writer: JoinHandle<std::result::Result<(), anyhow::Error>> = tokio::spawn(async move {
        while let Some(event) = rx.recv().await {
            match event.event_type {
                EventType::Tick => {
                    info!("Sending tick: {:?}", event.symbol);

                    let send_future: pulsar::producer::SendFuture = producer_ticks
                        .send_non_blocking(event)
                        .await
                        .map_err(|e| anyhow!("Failed to create send future: {:?}", e))?;

                    let msg_id: pulsar::CommandSendReceipt = send_future
                        .await
                        .map_err(|e| anyhow!("Failed to send tick to Pulsar: {:?}", e))?;

                    info!("Tick sent to Pulsar with id {:?}", msg_id);
                }

                EventType::MBP => {}
            }
        }

        Ok::<(), anyhow::Error>(())
    });

    // Creates a vector to hold all spawned Tokio tasks (JoinHandles) for concurrent clients.
    // - Each handle represents an asynchronous task running a client connection (e.g., Binance).
    // - The task returns a `Result<(), anyhow::Error>`, allowing errors to propagate to the main task.
    // - Collecting handles enables awaiting all client tasks before exiting the program.
    let mut handles: Vec<JoinHandle<std::result::Result<(), anyhow::Error>>> = Vec::new();

    match config.client_id {
        // Binance: 1 WS = 1 symbol
        Client::Binance => {
            let symbols_clone: Vec<String> = owned_symbols.clone();
            let tx_clone: tokio::sync::mpsc::Sender<OutEvent> = tx.clone();

            let handler: JoinHandle<std::result::Result<(), anyhow::Error>> =
                tokio::spawn(async move { clients::binance::run(symbols_clone, tx_clone).await });

            handles.push(handler);
        }

        Client::Databento => {}
    }

    drop(tx);

    // Await all spawned client tasks stored in `handles`.
    // - `h.await` waits for the Tokio task to finish (JoinHandle).
    // - The first `?` propagates any panic or task-level error from the spawned task.
    // - The second `?` propagates the actual `Result` returned by the client (`Ok(())` or `Err(anyhow::Error)`).
    // - Ensures that `main` only exits after all client tasks have completed successfully or returned an error.
    for h in handles {
        h.await??;
    }

    writer.await??;

    Ok(())
}
