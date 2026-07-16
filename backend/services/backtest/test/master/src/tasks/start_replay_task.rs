// BLACKER
// Copyright (C) 2026 Juan José Caballero Rey
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation version 3 of the License.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program. If not, see <https://www.gnu.org/licenses/>.

use crate::master::state::{AppState, MasterState, ReplayStatus, Tick};
use crate::snapshot::save_snapshot;
use producer::SendFuture;
use pulsar::ProducerOptions;
use pulsar::{Error as PulsarError, Pulsar, TokioExecutor};
use pulsar::{Producer, SerializeMessage, producer};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use std::time::Duration;
use tokio::sync::{RwLockReadGuard, RwLockWriteGuard};
use tracing::{error, info, warn};

//----------------------------------------------------------------------------------------------------------------------
// IMPLEMENTATION
//----------------------------------------------------------------------------------------------------------------------

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
    pub id: u64,
    pub time: u64,
    pub price: u64,
    pub qty: u64,
    pub is_buyer_maker: u8,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TickBatchMessage {
    pub boot_id: String,
    pub first_tick_index: usize,
    pub ticks: Vec<TickMessage>,
}

impl From<&Tick> for TickMessage {
    fn from(tick: &Tick) -> Self {
        Self {
            id: tick.id,
            time: tick.time,
            price: tick.price,
            qty: tick.qty,
            is_buyer_maker: tick.is_buyer_maker,
        }
    }
}

impl SerializeMessage for TickBatchMessage {
    /// Serializes the tick message into a MessagePack payload for Pulsar.
    fn serialize_message(input: Self) -> Result<producer::Message, PulsarError> {
        let payload: Vec<u8> = rmp_serde::to_vec(&input)
            .map_err(|e: rmp_serde::encode::Error| PulsarError::Custom(e.to_string()))?;

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
        //tokio::time::sleep(Duration::from_millis(5_000)).await; //DEBUG

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
                let (first_tick_index, batch_size, message) = {
                    let master: RwLockReadGuard<'_, MasterState> = state.master.read().await;

                    let ticks: &[Tick] = master.tick_batch(state.replay_batch_size);

                    if ticks.is_empty() {
                        drop(master);

                        let mut master: RwLockWriteGuard<'_, MasterState> =
                            state.master.write().await;

                        master.replay_status = ReplayStatus::Stopped;

                        info!("Replay no more ticks");

                        continue;
                    }

                    let batch_size: usize = ticks.len();

                    let message: TickBatchMessage = TickBatchMessage {
                        boot_id: state.boot_id.clone(),
                        first_tick_index: master.tick_index,
                        ticks: ticks.iter().map(TickMessage::from).collect(),
                    };

                    (master.tick_index, batch_size, message)
                };

                // 2. Handler producer futures.
                let send_future: SendFuture = match producer.send_non_blocking(message).await {
                    Ok(f) => f,
                    Err(e) => {
                        warn!(
                            tick_index = first_tick_index,
                            error = %e,
                            "Producer send failed (non-fatal), will retry."
                        );
                        continue;
                    }
                };

                match send_future.await {
                    Ok(_receipt) => {
                        if first_tick_index % 10000 == 0 {
                            info!(
                                tick_index = first_tick_index,
                                batch_size = batch_size,
                                "Tick batch published."
                            );
                        }
                    }
                    Err(e) => {
                        warn!(
                            tick_index = first_tick_index,
                            error = %e,
                            "Producer receipt failed (non-fatal), will retry."
                        );
                        continue;
                    }
                }

                // 4. Persist state only if the message sending was successful.
                let mut master: RwLockWriteGuard<'_, MasterState> = state.master.write().await;
                master.replay_step = ReplayStep::WaitEngine;
            }

            ReplayStep::WaitEngine => {
                state.engine_notify.notified().await;

                let mut master: RwLockWriteGuard<'_, MasterState> = state.master.write().await;
                master.replay_step = ReplayStep::WaitExecution;
            }

            ReplayStep::WaitExecution => {
                //state.execution_notify.notified().await;

                let mut master: RwLockWriteGuard<'_, MasterState> = state.master.write().await;
                master.replay_step = ReplayStep::Persist;
            }

            ReplayStep::Persist => {
                let mut master: RwLockWriteGuard<'_, MasterState> = state.master.write().await;

                let remaining: usize = master.tick_data.len() - master.tick_index;

                let processed: usize = remaining.min(state.replay_batch_size);

                master.tick_index += processed;
                master.replay_step = ReplayStep::PublishTick;

                if master.tick_index % 10_000 == 0 {
                    save_snapshot(&master).await?;
                }

                drop(master);

                state.engine_ack_notify.notify_one();
                state.execution_ack_notify.notify_one();

                state.publish_master_state().await?;
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
