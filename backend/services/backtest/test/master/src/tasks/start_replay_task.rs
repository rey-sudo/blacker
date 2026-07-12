use crate::snapshot::save_snapshot;
use crate::state::{AppState, MasterState, ReplayStatus, Tick, TickInfo};
use producer::SendFuture;
use pulsar::ProducerOptions;
use pulsar::{Error as PulsarError, Pulsar, TokioExecutor};
use pulsar::{Producer, SerializeMessage, producer};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use std::time::Duration;
use tokio::sync::{RwLockReadGuard, RwLockWriteGuard};
use tracing::{error, info, warn};

/// Replay state machine.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum ReplayStep {
    PublishTick,
    WaitEngine,
    WaitExecution,
    Persist,
}

/// Serializable trade payload published to Pulsar during replay.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TickMessage {
    pub tick_index: usize,
    pub id: u64,
    pub time: u64,
    pub price: u64,
    pub qty: u64,
    pub is_buyer_maker: u8,
}

impl TickMessage {
    /// Creates a replay message from a trade and its tick index.
    pub fn new(tick_index: usize, tick: Tick) -> Self {
        Self {
            tick_index,
            id: tick.id,
            time: tick.time,
            price: tick.price,
            qty: tick.qty,
            is_buyer_maker: tick.is_buyer_maker,
        }
    }
}

impl SerializeMessage for TickMessage {
    /// Serializes the trade message into a JSON payload for Pulsar.
    fn serialize_message(input: Self) -> Result<producer::Message, PulsarError> {
        let payload: Vec<u8> = serde_json::to_vec(&input)
            .map_err(|e: serde_json::Error| PulsarError::Custom(e.to_string()))?;

        Ok(producer::Message {
            payload,
            ..Default::default()
        })
    }
}

//----------------------------------------------------------------------------------------------------------------------
// REPLAY STATE MACHINE LOGIC
//----------------------------------------------------------------------------------------------------------------------

/// Executes the replay state machine until the replay finishes or is stopped.
async fn run_replay(state: AppState, producer: &mut Producer<TokioExecutor>) -> anyhow::Result<()> {
    loop {
        tokio::time::sleep(Duration::from_millis(5_000)).await; //DEBUG

        {
            // Verify if the master is Ready and the replay is Running.
            let master: RwLockReadGuard<'_, MasterState> = state.master.read().await;

            if !master.can_publish() {
                tokio::time::sleep(Duration::from_millis(1_000)).await;
                continue;
            }
        }

        // Replay state machine.
        let replay_step: ReplayStep = {
            let master: RwLockReadGuard<'_, MasterState> = state.master.read().await;
            master.replay_step
        };

        match replay_step {
            ReplayStep::PublishTick => {
                // 1. Fetch the current replay tick/trade.
                let current_tick: Option<TickInfo> = {
                    let master: RwLockReadGuard<'_, MasterState> = state.master.read().await;

                    info!("TICK {}", master.tick_index); //DEBUG

                    master.current_tick_info()
                };

                // 2. Stop the replay when there are no more ticks to publish.
                let tick_info: TickInfo = match current_tick {
                    Some(ti) => ti,

                    None => {
                        let mut master: RwLockWriteGuard<'_, MasterState> =
                            state.master.write().await;

                        master.replay_status = ReplayStatus::Stopped;

                        info!("Replay no more ticks");

                        continue;
                    }
                };

                // 3. Send the message via pulsar topic.
                let message: TickMessage = TickMessage::new(tick_info.tick_index, tick_info.tick);

                let send_future: SendFuture = match producer.send_non_blocking(message).await {
                    Ok(f) => f,
                    Err(e) => {
                        warn!(
                            tick_index = tick_info.tick_index,
                            error = %e,
                            "Producer send failed (non-fatal), will retry."
                        );
                        continue;
                    }
                };

                match send_future.await {
                    Ok(_receipt) => {
                        info!(
                            tick_index = tick_info.tick_index,
                            id = tick_info.tick.id,
                            "Tick published."
                        );
                    }
                    Err(e) => {
                        warn!(
                            tick_index = tick_info.tick_index,
                            error = %e,
                            "Producer receipt failed (non-fatal), will retry."
                        );
                        continue;
                    }
                }

                // 4. Persist state only if the message sending was successful.
                let mut master: RwLockWriteGuard<'_, MasterState> = state.master.write().await;
                master.replay_step = ReplayStep::WaitEngine;
                save_snapshot(&master).await?;
            }

            ReplayStep::WaitEngine => {
                state.engine_notify.notified().await;

                info!("EngineState received.");

                let mut master: RwLockWriteGuard<'_, MasterState> = state.master.write().await;
                master.replay_step = ReplayStep::WaitExecution;
                save_snapshot(&master).await?;
            }

            ReplayStep::WaitExecution => {
                //state.execution_notify.notified().await;

                info!("ExecutionState received.");

                let mut master: RwLockWriteGuard<'_, MasterState> = state.master.write().await;
                master.replay_step = ReplayStep::Persist;
                save_snapshot(&master).await?;
            }

            ReplayStep::Persist => {
                let mut master: RwLockWriteGuard<'_, MasterState> = state.master.write().await;
                master.tick_index += 1;
                master.replay_step = ReplayStep::PublishTick;
                save_snapshot(&master).await?;

                drop(master);

                state.engine_ack_notify.notify_one();
                state.execution_ack_notify.notify_one();
            }
        }
    }

    Ok(())
}

/// Starts the asynchronous replay worker.
pub fn start_replay_task(state: AppState, pulsar: Arc<Pulsar<TokioExecutor>>) {
    tokio::spawn(async move {
        // 1. Pulsar Producer: Create the pulsar producer.
        let mut producer: Producer<TokioExecutor> = match pulsar
            .producer()
            .with_topic("persistent://public/default/master.tick")
            .with_options(ProducerOptions {
                batch_size: Some(0),
                batch_timeout: Some(Duration::from_millis(1)),
                block_queue_if_full: true,
                ..Default::default()
            })
            .build()
            .await
        {
            Ok(p) => p,
            Err(error) => {
                error!(?error, "Failed to create Replay producer.");
                std::process::exit(1);
            }
        };

        // 2. Main loop: Start the main loop.
        match run_replay(state.clone(), &mut producer).await {
            Ok(()) => {}
            Err(error) => {
                error!(?error, "Replay failed with fatal error.");
                std::process::exit(1);
            }
        }

        info!("Replay task terminated.");
    });
}
