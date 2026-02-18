use crate::{
    application::{
        event::{ContextId, ControlEvent, InputEvent, OutputEvent},
        worker::{Command, worker_loop},
    },
    config::Config,
};
use pulsar::{Consumer, consumer::Message};
use std::collections::{HashMap, hash_map::Entry};
use tokio::sync::mpsc;

pub async fn handle_consumer(
    msg: Message<InputEvent>,
    consumer: &mut Consumer<InputEvent, pulsar::TokioExecutor>,
    workers: &mut HashMap<ContextId, mpsc::Sender<InputEvent>>,
    config: &Config,
    tx_output: &mpsc::Sender<OutputEvent>,
    tx_control: &mpsc::Sender<ControlEvent>,
) -> anyhow::Result<()> {
    // Attempt to deserialize the incoming Pulsar message into an InputEvent.
    // On failure, log the error, NACK the message for redelivery, and skip to the next iteration.
    let event: InputEvent = match msg.deserialize() {
        Ok(data) => data,
        Err(e) => {
            eprintln!("Deserialize error: {:?}", e);
            consumer.nack(&msg).await?;
            return Ok(());
        }
    };

    // Extract and clone the context identifier from the event.
    // This ID is used to route the message to the corresponding worker.
    let context_id: String = event.context_id.clone();

    // Convert the raw command field into a strongly-typed Command enum.
    // If conversion fails, log the error, ACK to skip
    let command: Command = match Command::try_from(event.command.clone()) {
        Ok(cmd) => cmd,
        Err(e) => {
            eprintln!("{}", e);
            consumer.ack(&msg).await?;
            return Ok(());
        }
    };

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
                return Ok(());
            }

            let (tx_input, rx_input) = mpsc::channel(100);
            let tx_ref = v.insert(tx_input);

            let tx_output_clone = tx_output.clone();
            let tx_control_clone = tx_control.clone();

            tokio::spawn(worker_loop(
                context_id.clone(),
                tx_control_clone,
                rx_input,
                tx_output_clone,
            ));

            match tx_ref.try_send(event) {
                Ok(_) => {
                    println!("Received Valid Command {}", context_id);
                    consumer.ack(&msg).await?;
                }
                Err(_) => consumer.nack(&msg).await?,
            }
        }
    }

    Ok(())
}
