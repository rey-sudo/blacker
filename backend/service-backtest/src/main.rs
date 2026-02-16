use futures::TryStreamExt;
use serde::{Deserialize, Serialize};
use service_backtest::infrastructure::pulsar::PulsarClient;
use std::{collections::HashMap, env};
use tokio::sync::mpsc;
use tokio::time::{self, Duration};

use pulsar::{
    Consumer, DeserializeMessage, Error as PulsarError, Payload, Producer, Pulsar,
    SerializeMessage, SubType, TokioExecutor, message::proto, producer,
};

// =====================
// Tipos
// =====================

type ContextId = String;

#[derive(Debug, Deserialize)]
struct InputEvent {
    context_id: ContextId,
    payload: String,
}

#[derive(Debug, Serialize)]
struct OutputEvent {
    context_id: ContextId,
    payload: Vec<u8>,
}

// =====================
// Pulsar Serialization
// =====================

impl DeserializeMessage for InputEvent {
    type Output = Result<InputEvent, serde_json::Error>;

    fn deserialize_message(payload: &Payload) -> Self::Output {
        serde_json::from_slice(&payload.data)
    }
}

impl SerializeMessage for OutputEvent {
    fn serialize_message(input: Self) -> Result<producer::Message, PulsarError> {
        Ok(producer::Message {
            payload: input.payload,
            partition_key: Some(input.context_id),
            ..Default::default()
        })
    }
}

// =====================
// Worker Actor
// =====================

struct Worker {
    context_id: ContextId,
    state: u64,
}

impl Worker {
    fn new(context_id: ContextId) -> Self {
        Self {
            context_id,
            state: 0,
        }
    }

    fn apply(&mut self, payload: Vec<u8>) {
        self.state += payload.len() as u64;
    }

    fn maybe_emit(&mut self) -> Option<OutputEvent> {
        if self.state > 0 && self.state % 10 == 0 {
            Some(OutputEvent {
                context_id: self.context_id.clone(),
                payload: format!("signal-{}", self.state).into_bytes(),
            })
        } else {
            None
        }
    }
}

// =====================
// Worker Loop
// =====================

async fn worker_loop(
    context_id: ContextId,
    mut rx: mpsc::Receiver<InputEvent>,
    tx_output: mpsc::Sender<OutputEvent>,
) {
    let mut worker = Worker::new(context_id.clone());
    let mut interval = time::interval(Duration::from_millis(200));

    loop {
        tokio::select! {
            Some(event) = rx.recv() => {
                worker.apply(event.payload.into());
            }

            _ = interval.tick() => {
                if let Some(out) = worker.maybe_emit() {
                    if tx_output.send(out).await.is_err() {
                        break;
                    }
                }
            }
        }
    }

    println!("Worker {} terminated", context_id);
}

// =====================
// Main
// =====================

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let pulsar_url = env::var("PULSAR_URL").unwrap_or_else(|_| "pulsar://localhost:6650".into());

    let max_workers: usize = env::var("MAX_WORKERS")
        .unwrap_or_else(|_| "100".into())
        .parse()
        .expect("Invalid MAX_WORKERS");

    let pulsar_client: PulsarClient = PulsarClient::new(&pulsar_url).await?;

    // =====================
    // Consumer (KeyShared)
    // =====================

    let mut consumer: Consumer<InputEvent, _> = pulsar_client.inner()
        .consumer()
        .with_topic("non-persistent://public/backtest/input")
        .with_subscription_type(SubType::KeyShared)
        .with_subscription("service-backtesting")
        .build()
        .await?;

    // =====================
    // Producer (alineado con doc)
    // =====================

    let mut producer = pulsar_client.inner()
        .producer()
        .with_topic("non-persistent://public/backtest/output")
        .with_name("my producer")
        .with_options(producer::ProducerOptions {
            schema: Some(proto::Schema {
                r#type: proto::schema::Type::String as i32,
                ..Default::default()
            }),
            ..Default::default()
        })
        .build()
        .await?;
    // Canal global salida
    let (tx_output, mut rx_output) = mpsc::channel::<OutputEvent>(10_000);

    // =====================
    // Publisher Task
    // =====================

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

    // =====================
    // Worker table
    // =====================

    let mut workers: HashMap<ContextId, mpsc::Sender<InputEvent>> = HashMap::new();

    // =====================
    // Consumer Loop
    // =====================

    while let Some(msg) = consumer.try_next().await? {
        let input = match msg.deserialize() {
            Ok(data) => {
                println!("📩 Input recibido: {:?}", data);
                data
            },
            Err(e) => {
                eprintln!("Deserialize error: {:?}", e);
                consumer.nack(&msg).await?;
                continue;
            }
        };

        let context_id = input.context_id.clone();

        if !workers.contains_key(&context_id) {
            if workers.len() >= max_workers {
                eprintln!("MAX_WORKERS reached");
                consumer.nack(&msg).await?;
                continue;
            }

            let (tx_worker, rx_worker) = mpsc::channel(100);
            workers.insert(context_id.clone(), tx_worker.clone());

            let tx_out = tx_output.clone();
            tokio::spawn(worker_loop(context_id.clone(), rx_worker, tx_out));
        }

        if let Some(tx_worker) = workers.get(&context_id) {
            match tx_worker.try_send(input) {
                Ok(_) => {
                    consumer.ack(&msg).await?;
                }
                Err(_) => {
                    consumer.nack(&msg).await?;
                }
            }
        } else {
            consumer.nack(&msg).await?;
        }
    }

    Ok(())
}
