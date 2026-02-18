use crate::application::event::{ContextId, ControlEvent, InputEvent, OutputEvent};
use cursor_db::cursor::CursorDB;
use serde::Deserialize;
use tokio::sync::mpsc;

#[derive(Debug, Deserialize)]
pub enum Command {
    Setup,
    Start,
    Stop,
    Delete,
    RunBacktest,
}

#[derive(Clone)]
pub struct WorkerState {
    pub tick_index: usize,
}

struct Worker {
    context_id: ContextId,
    state: WorkerState,
    cursor: CursorDB
}

impl Worker {
    fn new(context_id: ContextId, state: WorkerState, cursor: CursorDB) -> Self {
        Self {
            context_id,
            state,
            cursor,
        }
    }
}

pub async fn worker_loop(
    context_id: ContextId,
    tx_control: mpsc::Sender<ControlEvent>,
    mut rx: mpsc::Receiver<InputEvent>,
    tx_output: mpsc::Sender<OutputEvent>,
) {
    let data_path: &str = "../data/data.cdb";
    let index_path: &str = "../data/index.cdbi";

    let state: WorkerState = WorkerState { tick_index: 0 };

    let mut cursor: CursorDB = match CursorDB::open_or_create(data_path, index_path) {
        Ok(cursor_db) => {
            println!("CursorDB abierto o creado correctamente");
            cursor_db
        }
        Err(e) => {
            eprintln!("Error al abrir o crear CursorDB: {:?}", e);
            return; 
        }
    };

    let mut worker: Worker = Worker::new(context_id.clone(), state, cursor);

    loop {
        tokio::select! {

            Some(event) = rx.recv() => {

                match event.command {
                    Command::Setup => {
                        println!("Handling Setup command");
                        println!("Params: {}", event.params);
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

        }
    }
}
