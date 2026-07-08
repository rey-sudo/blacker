use crate::state::{AppState, MasterState, ReplayStatus, TickInfo};
use anyhow::Context;
use producer::SendFuture;
use pulsar::{CommandSendReceipt, ProducerOptions};
use pulsar::{Error as PulsarError, Pulsar, TokioExecutor};
use pulsar::{Producer, SerializeMessage, producer};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use std::time::Duration;
use tickdb::trade::Trade;
use tokio::sync::{RwLockReadGuard, RwLockWriteGuard};
use tracing::{error, info};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TradeMessage {
    pub id: u64,
    pub time: u64,
    pub price: u64,
    pub qty: u64,
    pub is_buyer_maker: u8,
}

impl From<Trade> for TradeMessage {
    fn from(trade: Trade) -> Self {
        Self {
            id: trade.id,
            time: trade.time,
            price: trade.price,
            qty: trade.qty,
            is_buyer_maker: trade.is_buyer_maker,
        }
    }
}

impl SerializeMessage for TradeMessage {
    fn serialize_message(input: Self) -> Result<producer::Message, PulsarError> {
        let payload = serde_json::to_vec(&input).map_err(|e| PulsarError::Custom(e.to_string()))?;
        Ok(producer::Message {
            payload,
            ..Default::default()
        })
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum ReplayStep {
    PublishTick,
    WaitEngine,
    WaitExecution,
    Persist,
}

pub fn start_replay_task(state: AppState, pulsar: Arc<Pulsar<TokioExecutor>>) {
    tokio::spawn(async move {
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
                error!(?error, "Failed to create Replay producer");
                return;
            }
        };

        loop {
            state.replay_notify.notified().await;
            match run_replay(state.clone(), &mut producer).await {
                Ok(()) => {}
                Err(error) => {
                    tracing::error!(?error, "Replay failed.");
                }
            }
        }
    });
}

async fn run_replay(state: AppState, producer: &mut Producer<TokioExecutor>) -> anyhow::Result<()> {
    let mut step: ReplayStep = ReplayStep::PublishTick;

    loop {
        {
            let master: RwLockReadGuard<'_, MasterState> = state.master.read().await;

            if master.replay_status != ReplayStatus::Running {
                info!("Replay stopped.");
                break;
            }
        }

        match step {
            ReplayStep::PublishTick => {
                let current_tick: Option<TickInfo> = {
                    let master: RwLockReadGuard<'_, MasterState> = state.master.read().await;

                    master.current_tick_info()
                };

                let tick_info: TickInfo = match current_tick {
                    Some(tick_info) => tick_info,

                    None => {
                        let mut master: RwLockWriteGuard<'_, MasterState> =
                            state.master.write().await;

                        master.replay_status = ReplayStatus::Stopped;

                        info!("Replay finished.");

                        break;
                    }
                };

                let message: TradeMessage = TradeMessage::from(tick_info.tick);

                let send_future: SendFuture = producer.send_non_blocking(message).await?;
                let receipt: CommandSendReceipt = send_future.await?;

                info!(
                    tick_index = tick_info.tick_index,
                    id = tick_info.tick.id,
                    r = ?receipt,
                    "Publish Tick"
                );

                step = ReplayStep::WaitEngine;
            }

            ReplayStep::WaitEngine => {
                state.engine_notify.notified().await;

                info!("EngineState received.");

                step = ReplayStep::WaitExecution;
            }

            ReplayStep::WaitExecution => {
                state.execution_notify.notified().await;

                info!("ExecutionState received.");

                step = ReplayStep::Persist;
            }

            ReplayStep::Persist => {
                let mut master: RwLockWriteGuard<'_, MasterState> = state.master.write().await;

                //
                // TODO:
                // Persistir snapshot global:
                //
                // master.tick_index
                // master.engine_state
                // master.execution_state
                //

                master.engine_state = None;
                master.execution_state = None;
                master.tick_index += 1;

                drop(master);

                //
                // Ahora sí autorizamos el ACK.
                //
                state.engine_ack_notify.notify_one();
                state.execution_ack_notify.notify_one();

                step = ReplayStep::PublishTick;
            }
        }
    }

    Ok(())
}
