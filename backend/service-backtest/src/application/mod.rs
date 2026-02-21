pub mod consumer;
pub mod control;
pub mod engine;
pub mod event;
pub mod producer;
pub mod worker;
pub mod timeframe;

use crate::application::consumer::handle_consumer;
use crate::application::control::handle_control;
use crate::application::event::{ContextId, ControlEvent, InputEvent, OutputEvent};
use crate::application::producer::spawn_output_handler;
use crate::config::Config;
use crate::infrastructure::pulsar::PulsarClient;
use futures::TryStreamExt;
use pulsar::{Consumer, SubType};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::mpsc;

pub async fn run() -> anyhow::Result<()> {
    let config: Arc<Config> = Arc::new(Config::from_env()?);

    let pulsar_client: Arc<PulsarClient> = Arc::new(PulsarClient::new(&config.pulsar_url).await?);

    // Creates a Pulsar consumer for the input topic using a KeyShared subscription
    // to distribute messages by key (context_id) across service instances.
    let mut consumer: Consumer<InputEvent, _> = pulsar_client
        .inner()
        .consumer()
        .with_topic("non-persistent://public/backtest/input")
        .with_subscription_type(SubType::KeyShared)
        .with_subscription(&config.service_name)
        .build()
        .await?;

    // Stores active workers indexed by ContextId, each mapped to its input channel sender.
    // Used to route incoming InputEvent messages to the correct worker instance.
    let mut workers: HashMap<ContextId, mpsc::Sender<InputEvent>> = HashMap::new();

    let (tx_control, mut rx_control) = mpsc::channel::<ControlEvent>(1_000);

    // Creates a bounded MPSC channel (capacity 10,000) for sending OutputEvent messages
    // from workers to a dedicated task responsible for publishing them to Pulsar.
    let (tx_output, mut rx_output) = mpsc::channel::<OutputEvent>(10_000);

    // Spawns a dedicated asynchronous task responsible for publishing OutputEvent
    // messages to the Pulsar output topic. The task runs independently from the
    // main event loop and continuously consumes events from rx_output.
    spawn_output_handler(rx_output, config.clone(), pulsar_client.clone());

    // Main event loop.
    // Uses `tokio::select!` to concurrently listen for:
    // 1) New input messages from the Pulsar consumer.
    // 2) Control events emitted by worker tasks.
    loop {
        tokio::select! {

            res = consumer.try_next() => {
                match res {
                    // A valid message was received from Pulsar.
                    // Delegate processing and routing to `handle_consumer`.
                    Ok(Some(msg)) => {
                        handle_consumer(
                            msg,
                            &mut consumer,
                            &mut workers,
                            &config,
                            &tx_output,
                            &tx_control,
                        ).await?;
                    }

                    // This typically indicates the consumer stream ended.
                    // Currently ignored to keep the loop alive.
                    Ok(None) => (),

                    // An error occurred while polling the consumer.
                    // The error is logged and the loop continues,
                    Err(e) => {
                        eprintln!("Consumer error: {:?}", e);
                        continue;
                    }
                }
            }

            // Receives control events from workers (e.g., Delete).
            // These events are used to manage the worker registry safely
            // from the main loop (single ownership of `workers`).
            Some(control) = rx_control.recv() => {
                handle_control(control, &mut workers);
            }

        }
    }
}
