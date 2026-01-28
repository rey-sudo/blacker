/*
 * BLACKER
 * Copyright (C) 2025  Juan José Caballero Rey
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

pub mod clients;

use std::time::Duration;

use crate::application::clients::client::Client;
use crate::common::event::{EventType, OutEvent};
use crate::config::Config;
use crate::infrastructure::sharding::belongs_to_shard;
use anyhow::Result;
use pulsar::{Pulsar, TokioExecutor};
use tokio::task::JoinHandle;
use tracing::{error, info, warn};

const MAX_RETRIES: u32 = 3;
const RETRY_DELAY: Duration = Duration::from_millis(100);

pub async fn run(config: Config) -> Result<()> {
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

    // If no symbols are assigned to this pod, there is no work to perform.
    //
    // This situation can occur when:
    // - The set of shard IDs assigned to this pod does not match any of the
    //   logical shards derived from the configured symbol list
    // - The number of pods or shard assignments exceeds the effective
    //   symbol distribution
    //
    // Since symbol ownership is computed deterministically using a hash-based
    // sharding function, this condition is stable as long as the configuration
    // remains unchanged. In this case, the service exits gracefully.
    if owned_symbols.is_empty() {
        warn!("No symbols assigned to this pod");
        return Ok(());
    }

    info!(
        client = ?config.client_id,
        symbol_count = owned_symbols.len(),
        "Ingest workload assigned to this instance"
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

    // Spawn a dedicated asynchronous task responsible for publishing events to Apache Pulsar.
    //
    // The task acts as the single Pulsar writer:
    // - Consumes OutEvent messages from a bounded Tokio MPSC receiver, providing backpressure
    // - Serializes and sends events to Pulsar, awaiting broker acknowledgments
    // - Isolates Pulsar I/O from ingestion logic and centralizes error handling
    //
    // This design ensures ordered delivery per producer instance and deterministic shutdown.
    // The task exits gracefully once all senders are dropped and the channel is drained.
    let writer: JoinHandle<std::result::Result<(), anyhow::Error>> = tokio::spawn(async move {
        while let Some(event) = rx.recv().await {
            match event.event_type {
                EventType::Tick => {
                    let mut sent: bool = false;

                    for attempt in 1..=MAX_RETRIES {
                        match producer_ticks.send_non_blocking(event.clone()).await {
                            Ok(_) => {
                                #[cfg(debug_assertions)]
                                info!(
                                    attempt,
                                    symbol = ?event.symbol,
                                    "Tick successfully sent to Pulsar"
                                );
                                sent = true;
                                break;
                            }
                            Err(e) => {
                                warn!(
                                    attempt,
                                    symbol = ?event.symbol,
                                    error = ?e,
                                    "Failed to send tick to Pulsar, retrying"
                                );
                                tokio::time::sleep(RETRY_DELAY).await;
                            }
                        }
                    }

                    if !sent {
                        error!(
                            symbol = ?event.symbol,
                            retries = MAX_RETRIES,
                            "Dropping tick after exhausting retries"
                        );
                    }
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

    // Spawn the Client task based on the configured client.
    //
    // For the selected provider:
    // - A dedicated asynchronous task is created using `tokio::spawn`
    // - The list of symbols owned by this instance is cloned and passed to the task
    // - A clone of the MPSC sender is provided so the provider can emit OutEvent messages
    //   without being coupled to the Pulsar writer or other producers
    //
    // Each provider runs independently and publishes events into the shared channel.
    // The returned JoinHandle is stored to allow coordinated shutdown and error
    // propagation to the main task.
    match config.client_id {
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
