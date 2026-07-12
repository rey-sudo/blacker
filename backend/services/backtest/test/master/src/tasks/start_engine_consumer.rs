use crate::slaves::engine::EngineState;
use crate::master::state::{AppState, MasterState};
use futures::TryStreamExt;
use pulsar::consumer::Message;
use pulsar::{Consumer, DeserializeMessage, Payload, Pulsar, SubType, TokioExecutor};
use std::sync::Arc;
use tokio::sync::{RwLockWriteGuard};
use tracing::{error, info};

impl DeserializeMessage for EngineState {
    type Output = Result<EngineState, serde_json::Error>;

    fn deserialize_message(payload: &Payload) -> Self::Output {
        serde_json::from_slice(&payload.data)
    }
}

fn validate_engine_state(master: &MasterState, engine: &EngineState) -> Result<(), &'static str> {
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

                if let Err(reason) = validate_engine_state(&master, &engine_state) {
                    error!(reason, "Rejected EngineState.");

                    drop(master);

                    if let Err(error) = consumer.nack(&message).await {
                        error!(?error, "Failed to NACK EngineState.");
                    }

                    continue;
                }

                master.engine_state = Some(engine_state);

                info!(
                    master_tick_index = master.tick_index,
                    engine_tick_index, "EngineState received."
                );
            }

            state.engine_notify.notify_one();

            state.engine_ack_notify.notified().await;

            if let Err(error) = consumer.ack(&message).await {
                error!(?error, "Failed to ACK EngineState.");
                continue;
            }

            info!("EngineState ACK.");
        }

        info!("Engine consumer finished.");
    });
}
