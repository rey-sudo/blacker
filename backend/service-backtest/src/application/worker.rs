use crate::application::event::{ContextId, ControlEvent, InputEvent, OutputEvent};
use cursor_db::{cursor::CursorDB, record::Record};
use serde::Deserialize;
use serde_json;
use tokio::sync::mpsc;
use tracing::{debug, error, info};

#[derive(Debug)]
pub enum WorkerError {
    AlreadyInitialized,
    InvalidParams,
    CursorInitFailed,
    EmptyDataset
}

#[derive(Deserialize)]
struct SetupParams {
    symbol: String
}

#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub struct Symbol(String);

impl Symbol {
    pub fn new(value: impl Into<String>) -> Self {
        Self(value.into())
    }

    pub fn as_str(&self) -> &str {
        &self.0
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
#[repr(u8)]
pub enum Timeframe {
    M1 = 1,
    M5 = 2,
    M15 = 3,
    M30 = 4,
    H1 = 5,
    H4 = 6,
    D1 = 7,
}

impl Timeframe {
    pub const fn as_seconds(self) -> u64 {
        match self {
            Timeframe::M1 => 60,
            Timeframe::M5 => 300,
            Timeframe::M15 => 900,
            Timeframe::M30 => 1800,
            Timeframe::H1 => 3600,
            Timeframe::H4 => 14_400,
            Timeframe::D1 => 86_400,
        }
    }
}

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
    pub current_index: Record,
}

struct Worker {
    context_id: ContextId,
    symbol: Option<Symbol>,
    state: Option<WorkerState>,
    cursor: Option<CursorDB>,
}

impl Worker {
    fn new(context_id: ContextId) -> Self {
        Self {
            context_id,
            symbol: None,
            state: None,
            cursor: None,
        }
    }
}

impl Worker {
    pub fn setup(&mut self, event: InputEvent) -> Result<(), WorkerError> {

        if self.state.is_some() {
            return Err(WorkerError::AlreadyInitialized);
        }

        info!("{:?}", event.params);

        let params: SetupParams =
            serde_json::from_str(&event.params).map_err(|_| WorkerError::InvalidParams)?;

        let symbol: Symbol = Symbol::new(params.symbol);

        let data_path: &str = "data/data.cdb";      //symbol
        let index_path: &str = "data/index.cdbi";

        let mut cursor: CursorDB =
            CursorDB::new(data_path, index_path).map_err(|_| WorkerError::CursorInitFailed)?;

        let current_index = cursor
            .move_to_first()
            .map_err(|_| WorkerError::CursorInitFailed)?
            .ok_or(WorkerError::EmptyDataset)?;

        info!("{:?}", current_index);

        let state: WorkerState = WorkerState { current_index };

        self.symbol = Some(symbol);
        self.cursor = Some(cursor);
        self.state = Some(state);

        Ok(())
    }
}

pub async fn worker_loop(
    context_id: ContextId,
    tx_control: mpsc::Sender<ControlEvent>,
    mut rx: mpsc::Receiver<InputEvent>,
    tx_output: mpsc::Sender<OutputEvent>,
) {
    let mut worker: Worker = Worker::new(context_id.clone());

    loop {
        tokio::select! {

            Some(event) = rx.recv() => {

                match event.command {
                    Command::Setup => {
                        match worker.setup(event) {
                            Ok(_) => {
                                info!("Worker setup complete");
                            }
                            Err(e) => {
                                error!("Setup failed: {:?}", e);
                            }
                        }
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

/*

    let data_path: &str = "../data/data.cdb";
    let index_path: &str = "../data/index.cdbi";

    let mut cursor: CursorDB = match CursorDB::new(data_path, index_path) {
       Ok(c) => {
           println!("CursorDB abierto o creado correctamente");
           c
       }
       Err(e) => {
           eprintln!("Error al abrir o crear CursorDB: {:?}", e);
           return;
       }
   };

   match cursor.move_to_first() {
       Ok(_) => {
           println!("Cursor posicionado en el inicio con éxito.");
           // Aquí podrías llamar a db.next() para leer el primer registro
       }
       Err(e) => {
           eprintln!("Error al mover el cursor: {}", e);
           // Aquí decides si quieres hacer un 'return' o intentar otra cosa
       }
   }

   let current_index = cursor.current()?; // Si hay error, la función termina aquí

   match current_index {
       Some(record) => println!("Datos: {:?}", record.payload),
       None => println!("Cursor en posición nula."),
   }



*/
