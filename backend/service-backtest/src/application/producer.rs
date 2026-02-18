use std::sync::Arc;
use crate::{
    application::event::OutputEvent, config::Config, infrastructure::pulsar::PulsarClient,
};
use pulsar::{Producer, TokioExecutor};
use tokio::sync::mpsc;

// Spawns a dedicated async task that continuously receives OutputEvent messages
// from the workers and publishes them to Pulsar using the producer.
pub fn spawn_output_handler(
    mut rx_output: mpsc::Receiver<OutputEvent>,
    config: Arc<Config>,
    pulsar_client: Arc<PulsarClient>,
) -> tokio::task::JoinHandle<()> {
    tokio::spawn(async move {
        // Creates a Pulsar producer for the output topic, identified by the service name,
        // used to publish processed results or events back to the system.
        let mut producer: Producer<TokioExecutor> = match pulsar_client
            .inner()
            .producer()
            .with_topic("non-persistent://public/backtest/output")
            .with_name(&config.service_name)
            .build()
            .await
        {
            Ok(p) => p,
            Err(e) => {
                eprintln!("Producer build error: {:?}", e);
                return;
            }
        };

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
    })
}
