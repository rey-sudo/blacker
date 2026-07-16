use crate::master::state::{AppState, MasterState};
use crate::slaves::engine::{EngineState, EngineStateMessage};
use anyhow::{Result, anyhow};
use futures::TryStreamExt;
use pulsar::consumer::Message;
use pulsar::{Consumer, DeserializeMessage, Payload, Pulsar, SubType, TokioExecutor};
use std::sync::Arc;
use tokio::sync::RwLockWriteGuard;
use tracing::{error, info};

impl DeserializeMessage for EngineStateMessage {
    type Output = Result<EngineStateMessage, rmp_serde::decode::Error>;

    fn deserialize_message(payload: &Payload) -> Self::Output {
        rmp_serde::from_slice(&payload.data)
    }
}

fn validate_engine_state(
    boot_id: &str,
    replay_batch_size: usize,
    master: &MasterState,
    engine: &EngineStateMessage,
) -> Result<()> {
    if engine.boot_id != boot_id {
        return Err(anyhow!("Unexpected boot_id."));
    }

    let remaining: usize = master.tick_data.len() - master.tick_index;

    let expected_last_tick: usize = master.tick_index + remaining.min(replay_batch_size) - 1;

    if engine.tick_index != expected_last_tick {
        return Err(anyhow!(
            "Unexpected engine tick_index. Expected {}, got {}",
            expected_last_tick,
            engine.tick_index
        ));
    }

    Ok(())
}

pub fn start_engine_consumer(state: AppState, pulsar: Arc<Pulsar<TokioExecutor>>) {
    tokio::spawn(async move {
        // 1. Create Consumer: create pulsar consumer.
        let mut consumer: Consumer<EngineStateMessage, TokioExecutor> = match pulsar
            .consumer()
            .with_topic("persistent://public/default/engine.state")
            .with_subscription_type(SubType::Exclusive)
            .with_subscription("master-sub")
            .build()
            .await
        {
            Ok(con) => con,
            Err(error) => {
                error!(?error, "Failed to create EngineState consumer.");
                return;
            }
        };

        info!("Engine consumer started.");

        // 1. Start Loop: start the main loop.
        loop {
            //  Receive the next EngineState message from Pulsar.
            let message: Message<EngineStateMessage> = match consumer.try_next().await {
                Ok(Some(msg)) => msg,
                Ok(None) => {
                    info!("Engine consumer closed.");
                    break;
                }
                Err(error) => {
                    error!(?error, "Failed to receive EngineState.");
                    continue;
                }
            };

            // Deserialize the received EngineState message.
            let engine_state: EngineStateMessage = match message.deserialize() {
                Ok(state) => state,

                Err(error) => {
                    error!(?error, "Failed to deserialize EngineState. Aborting.");

                    if let Err(error) = consumer.ack(&message).await {
                        error!(?error, "Failed to ACK invalid EngineState.");
                    }

                    std::process::exit(1);
                }
            };

            let engine_tick_index: usize = engine_state.tick_index;

            {
                let mut master: RwLockWriteGuard<'_, MasterState> = state.master.write().await;

                match validate_engine_state(
                    state.boot_id.as_str(),
                    state.replay_batch_size,
                    &master,
                    &engine_state,
                ) {
                    Ok(()) => {
                        master.engine_state = Some(engine_state.into());

                        if engine_tick_index % 10000 == 0 {
                            info!(
                                master_tick_index = master.tick_index,
                                engine_tick_index, "EngineState received."
                            );
                        }
                    }
                    Err(reason) => {
                        error!(?reason, "Rejected EngineState ACKing...");

                        drop(master);

                        if let Err(error) = consumer.ack(&message).await {
                            error!(?error, "Failed to early ACK EngineState.");
                        }

                        continue;
                    }
                }
            }

            state.engine_notify.notify_one();

            state.engine_ack_notify.notified().await;

            match consumer.ack(&message).await {
                Ok(_) => {
                    // info!("EngineState ACK.");
                }
                Err(error) => {
                    error!(?error, "Failed to ACK EngineState.");
                    continue;
                }
            }
        }

        info!("Engine consumer finished.");
    });
}
