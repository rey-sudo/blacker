pub mod consumer;
pub mod control;
pub mod engine;
pub mod event;
pub mod producer;
pub mod worker;

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

    spawn_output_handler(rx_output, config.clone(), pulsar_client.clone());

    loop {
        tokio::select! {

            res = consumer.try_next() => {
                match res {
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

                    Ok(None) => (),

                    Err(e) => {
                        eprintln!("Consumer error: {:?}", e);
                        continue;
                    }
                }
            }

            Some(control) = rx_control.recv() => {
                handle_control(control, &mut workers);
            }

        }
    }
}
