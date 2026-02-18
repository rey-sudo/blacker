use crate::application::event::{ContextId, ControlEvent, InputEvent, OutputEvent};
use std::time::Duration;
use tokio::{sync::mpsc, time};

#[derive(Debug)]
pub enum Command {
    Setup,
    Start,
    Stop,
    Delete,
    RunBacktest,
}

impl TryFrom<String> for Command {
    type Error = String;

    fn try_from(value: String) -> Result<Self, Self::Error> {
        match value.as_str() {
            "SETUP" => Ok(Command::Setup),
            "DELETE" => Ok(Command::Delete),
            "START" => Ok(Command::Start),
            "STOP" => Ok(Command::Stop),
            "RUN_BACKTEST" => Ok(Command::RunBacktest),
            _ => Err(format!("Invalid command: {}", value)),
        }
    }
}

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

pub async fn worker_loop(
    context_id: ContextId,
    tx_control: mpsc::Sender<ControlEvent>,
    mut rx: mpsc::Receiver<InputEvent>,
    tx_output: mpsc::Sender<OutputEvent>,
) {
    let mut worker = Worker::new(context_id.clone());
    let mut interval = time::interval(Duration::from_millis(200));

    loop {
        tokio::select! {
            Some(event) = rx.recv() => {
                worker.apply(event.params.into());
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
