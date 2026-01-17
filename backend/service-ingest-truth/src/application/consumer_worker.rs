use crate::{
    application::symbol_worker::{SymbolCommand, spawn_symbol_worker},
    common::tick::Tick,
    config::Config,
    infrastructure::{
        database::Database,
        pulsar::{PulsarClient, tick_consumer::TickConsumer},
    },
};
use anyhow::Result;
use futures_util::TryStreamExt;
use pulsar::consumer::Message;
use std::collections::HashMap;
use tokio::select;
use tokio::sync::mpsc;
use tokio::task::JoinHandle;
use tracing::{info, warn};

/// Starts the main dispatcher loop
/// - Receives ticks from Pulsar
/// - Routes them to symbol workers
/// - Handles shutdown signal
pub async fn start_dispatcher(
    mut tick_consumer: TickConsumer,
    db: Database,
    pulsar_client: PulsarClient,
    config: Config,
) -> Result<()> {
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
