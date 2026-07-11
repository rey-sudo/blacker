use crate::common::MasterStatus;
use crate::slaves::engine::EngineState;
use crate::state::{AppState, MasterState, ReplayStatus};
use futures::TryStreamExt;
use pulsar::consumer::Message;
use pulsar::{Consumer, DeserializeMessage, Payload, Pulsar, SubType, TokioExecutor};
use std::sync::Arc;
use std::time::Duration;
use tokio::sync::{RwLockReadGuard, RwLockWriteGuard};
use tracing::{error, info};

impl DeserializeMessage for EngineState {
    type Output = Result<EngineState, serde_json::Error>;

    fn deserialize_message(payload: &Payload) -> Self::Output {
        serde_json::from_slice(&payload.data)
    }
}

fn validate_engine_state(master: &MasterState, engine: &EngineState) -> Result<(), &'static str> {
    if master.replay_status != ReplayStatus::Running {
        return Err("Replay is not running.");
    }

    if engine.version != master.version {
        return Err("Unexpected version.");
    }

    if engine.tick_index != master.tick_index {
        return Err("Unexpected tick_index.");
    }

    Ok(())
}

pub fn start_engine_consumer(state: AppState, pulsar: Arc<Pulsar<TokioExecutor>>) {
    tokio::spawn(async move {
        // 1. Create Consumer: create pulsar consumer.
        let mut consumer: Consumer<EngineState, TokioExecutor> = match pulsar
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
            //  Wait until the master is ready and the replay is running.
            let ready_to_receive: bool = {
                let master: RwLockReadGuard<'_, MasterState> = state.master.read().await;

                master.status == MasterStatus::Ready
                    && master.replay_status == ReplayStatus::Running
            };

            if !ready_to_receive {
                tokio::time::sleep(Duration::from_millis(100)).await;
                continue;
            }

            //  Receive the next EngineState message from Pulsar.
            let message: Message<EngineState> = match consumer.try_next().await {
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
            let engine_state: EngineState = match message.deserialize() {
                Ok(state) => state,

                Err(error) => {
                    error!(
                        message_id = ?message.message_id(),
                        ?error,
                        "Failed to deserialize EngineState. Replay aborted."
                    );

                    {
                        let mut master: RwLockWriteGuard<'_, MasterState> =
                            state.master.write().await;

                        master.replay_status = ReplayStatus::Error;
                    }

                    if let Err(error) = consumer.ack(&message).await {
                        error!(?error, "Failed to ACK invalid EngineState.");
                    }

                    break;
                }
            };

            {
                let mut master: RwLockWriteGuard<'_, MasterState> = state.master.write().await;

                info!(engine_state.tick_index, master.tick_index);

                if let Err(reason) = validate_engine_state(&master, &engine_state) {
                    error!(reason, "Rejected EngineState.");

                    drop(master);

                    if let Err(error) = consumer.nack(&message).await {
                        error!(?error, "Failed to NACK EngineState.");
                    }

                    continue;
                }

                master.engine_state = Some(engine_state);

                info!(tick_index = master.tick_index, "EngineState received.");
            }

            //
            // Despertar ReplayTask.
            //
            state.engine_notify.notify_one();

            //
            // Esperar autorización para ACK.
            //
            state.engine_ack_notify.notified().await;

            //
            // Confirmar el mensaje.
            //
            if let Err(error) = consumer.ack(&message).await {
                error!(?error, "Failed to ACK EngineState.");
                continue;
            }

            info!("EngineState ACK.");
        }

        info!("Engine consumer finished.");
    });
}
