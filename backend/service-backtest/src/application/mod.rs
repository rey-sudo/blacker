pub mod engine;
pub mod event;
pub mod worker;

use crate::application::event::{ContextId, InputEvent, OutputEvent};
use crate::application::worker::{Command, worker_loop};
use crate::config::Config;
use crate::infrastructure::pulsar::PulsarClient;
use futures::TryStreamExt;
use pulsar::Producer;
use pulsar::{Consumer, SubType};
use std::collections::HashMap;
use std::collections::hash_map::Entry;
use std::convert::TryFrom;
use std::sync::Arc;
use tokio::sync::mpsc;

pub async fn run() -> anyhow::Result<()> {
    let config: Arc<Config> = Arc::new(Config::from_env()?);

    let pulsar_client: PulsarClient = PulsarClient::new(&config.pulsar_url).await?;

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

    // Creates a Pulsar producer for the output topic, identified by the service name,
    // used to publish processed results or events back to the system.
    let mut producer: Producer<pulsar::TokioExecutor> = pulsar_client
        .inner()
        .producer()
        .with_topic("non-persistent://public/backtest/output")
        .with_name(&config.service_name)
        .build()
        .await?;

    // Creates a bounded MPSC channel (capacity 10,000) for sending OutputEvent messages
    // from workers to a dedicated task responsible for publishing them to Pulsar.
    let (tx_output, mut rx_output) = mpsc::channel::<OutputEvent>(10_000);

    // Spawns a dedicated async task that continuously receives OutputEvent messages
    // from the workers and publishes them to Pulsar using the producer.
    tokio::spawn(async move {
        while let Some(event) = rx_output.recv().await {
            match producer.send_non_blocking(event).await {
                Ok(delivery_future) => {
                    if let Err(e) = delivery_future.await {
                        eprintln!("Delivery error: {:?}", e);
                    }
                }
                Err(e) => {
                    eprintln!("Enqueue error: {:?}", e);
                }
            }
        }

        if let Err(e) = producer.close().await {
            eprintln!("Producer close error: {:?}", e);
        }
    });

    // Stores active workers indexed by ContextId, each mapped to its input channel sender.
    // Used to route incoming InputEvent messages to the correct worker instance.
    let mut workers: HashMap<ContextId, mpsc::Sender<InputEvent>> = HashMap::new();

    while let Some(msg) = consumer.try_next().await? {
        let event: InputEvent = match msg.deserialize() {
            Ok(data) => {
                println!("📩 Input recibido: {:?}", data);
                data
            }
            Err(e) => {
                eprintln!("Deserialize error: {:?}", e);
                consumer.nack(&msg).await?;
                continue;
            }
        };

        let context_id: String = event.context_id.clone();

        let command: Command = match Command::try_from(event.command.clone()) {
            Ok(cmd) => cmd,
            Err(e) => {
                eprintln!("{}", e);
                consumer.nack(&msg).await?;
                continue;
            }
        };

        if matches!(command, Command::Delete) {
            println!("Delete process for {}", context_id);

            if let Some(tx) = workers.get(&context_id) {
                if tx.try_send(event).is_err() {
                    consumer.nack(&msg).await?;
                    continue;
                }
            }

            workers.remove(&context_id);
            consumer.ack(&msg).await?;
            continue;
        }

        let workers_len: usize = workers.len();
        let max_reached: bool = workers_len >= config.max_workers;

        match workers.entry(context_id.clone()) {
            Entry::Occupied(e) => {
                match e.get().try_send(event) {
                    Ok(_) => {
                        println!("Received Valid Command {}", context_id);
                        consumer.ack(&msg).await?;
                    }
                    Err(_) => consumer.nack(&msg).await?,
                };
            }

            Entry::Vacant(v) => {
                if max_reached {
                    consumer.nack(&msg).await?;
                    continue;
                }

                let (tx_input, rx_input) = mpsc::channel(100);
                let tx_ref: &mut mpsc::Sender<InputEvent> = v.insert(tx_input);

                let tx_output_clone = tx_output.clone();
                tokio::spawn(worker_loop(context_id.clone(), rx_input, tx_output_clone));

                match tx_ref.try_send(event) {
                    Ok(_) => {
                        println!("Received Valid Command {}", context_id);
                        consumer.ack(&msg).await?;
                    }
                    Err(_) => consumer.nack(&msg).await?,
                }
            }
        }
    }

    Ok(())
}
