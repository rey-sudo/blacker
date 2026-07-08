use crate::engine::EngineState;
use crate::state::{AppState, MasterState, ReplayStatus};
use futures::TryStreamExt;
use pulsar::consumer::Message;
use pulsar::{Consumer, DeserializeMessage, Payload, Pulsar, TokioExecutor};
use std::sync::Arc;
use tracing::{error, info};

impl DeserializeMessage for EngineState {
    type Output = Result<EngineState, serde_json::Error>;

    fn deserialize_message(payload: &Payload) -> Self::Output {
        serde_json::from_slice(&payload.data)
    }
}

pub fn start_engine_consumer(state: AppState, pulsar: Arc<Pulsar<TokioExecutor>>) {
    tokio::spawn(async move {
        let mut consumer: Consumer<EngineState, TokioExecutor> = match pulsar
            .consumer()
            .with_topic("engine-state")
            .with_subscription("master")
            .build()
            .await
        {
            Ok(consumer) => consumer,
            Err(error) => {
                error!(?error, "Failed to create EngineState consumer.");
                return;
            }
        };

        loop {
            let message: Message<EngineState> = match consumer.try_next().await {
                Ok(Some(message)) => message,
                Ok(None) => {
                    info!("EngineState consumer closed.");
                    break;
                }
                Err(error) => {
                    error!(?error, "Failed to receive EngineState.");
                    continue;
                }
            };

            let engine_state: EngineState = match message.deserialize() {
                Ok(state) => state,
                Err(error) => {
                    error!(?error, "Failed to deserialize EngineState.");

                    if let Err(error) = consumer.nack(&message).await {
                        error!(?error, "Failed to NACK EngineState.");
                    }

                    continue;
                }
            };

            {
                let mut master: tokio::sync::RwLockWriteGuard<'_, MasterState> =
                    state.master.write().await;

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
    });
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
