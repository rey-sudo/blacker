use crate::application::event::{ContextId, ControlEvent, InputEvent, OutputEvent};
use serde::Deserialize;
use std::time::Duration;
use tokio::{sync::mpsc, time};

#[derive(Debug, Deserialize)]
pub enum Command {
    Setup,
    Start,
    Stop,
    Delete,
    RunBacktest,
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

            match event.command {
                Command::Setup => {
                    println!("Handling Setup command");
                    // lógica para inicialización
                }

                Command::Start => {
                    println!("Handling Start command");
                    // lógica para iniciar proceso
                }

                Command::Stop => {
                    println!("Handling Stop command");
                    // lógica para detener proceso
                }

                Command::Delete => {
                    println!("Handling Delete command");
                    // lógica para eliminar recursos
                }

                Command::RunBacktest => {
                    println!("Handling RunBacktest command");
                    // lógica para ejecutar backtest
                }
            }
        
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
