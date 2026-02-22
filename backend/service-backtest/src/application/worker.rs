use crate::{
    application::{
        event::{ContextId, ControlEvent, InputEvent, OutputEvent, OutputEventKind},
        timeframe::{Timeframe, TimeframeState},
    },
    common::candle::Ohlcv,
};
use cursor_db::{cursor::CursorDB, record::Record};
use serde::{Deserialize, Serialize};
use serde_json;
use std::collections::HashMap;
use tokio::sync::mpsc;
use tracing::{debug, error, info};

#[derive(Debug)]
pub enum WorkerError {
    AlreadyInitialized,
    InvalidParams,
    CursorInitFailed,
    EmptyDataset,
    NotInitialized,
    InvalidTimeframe,
    SerializationError,
    DeserializationError,
    OutputChannelClosed,
    CursorMethodError,
    CursorEmpty,
}

#[derive(Deserialize)]
struct SetupParams {
    symbol: String,
}

#[derive(Deserialize)]
pub struct AddTimeframeParams {
    pub timeframe: String,
}
#[derive(Deserialize)]
pub struct NextTimeframeParams {
    pub timeframe: String,
}
#[derive(Deserialize)]
pub struct BackTimeframeParams {
    pub timeframe: String,
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

#[derive(Debug, Deserialize)]
pub enum Command {
    Setup,
    AddTimeframe,
    NextTimeframeCandle,
    BackTimeframeCandle,
    Stop,
    Delete,
    RunBacktest,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub enum WorkerStatus {
    Initialized,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct WorkerState {
    pub status: WorkerStatus,
    pub current_index: Record,
    pub timeframes: HashMap<Timeframe, TimeframeState>,
}

struct Worker {
    context_id: ContextId,
    symbol: Option<Symbol>,
    state: Option<WorkerState>,
    tick_cursor: Option<CursorDB>,
    timeframe_cursors: HashMap<Timeframe, CursorDB>,
    tx_control: mpsc::Sender<ControlEvent>,
    tx_output: mpsc::Sender<OutputEvent>,
}

impl Worker {
    fn new(
        context_id: ContextId,
        tx_control: mpsc::Sender<ControlEvent>,
        tx_output: mpsc::Sender<OutputEvent>,
    ) -> Self {
        Self {
            context_id,
            symbol: None,
            state: None,
            tick_cursor: None,
            timeframe_cursors: HashMap::new(),
            tx_control,
            tx_output,
        }
    }

    pub fn is_initialized(&self) -> bool {
        self.state.is_some()
    }

    pub fn tx_control(&self) -> &mpsc::Sender<ControlEvent> {
        &self.tx_control
    }

    pub fn tx_output(&self) -> &mpsc::Sender<OutputEvent> {
        &self.tx_output
    }

    pub fn emit(&self, output: OutputEvent) {
        let tx = self.tx_output().clone();

        tokio::spawn(async move {
            if let Err(e) = tx.send(output).await {
                eprintln!("Error enviando OutputEvent: {:?}", e);
            }
        });
    }

    pub fn emit_state(&self) -> Result<(), WorkerError> {
        let state: &WorkerState = self.state.as_ref().ok_or(WorkerError::NotInitialized)?;

        let payload: Vec<u8> =
            serde_json::to_vec(state).map_err(|_| WorkerError::SerializationError)?;

        let output: OutputEvent = OutputEvent {
            context_id: self.context_id.clone(),
            kind: OutputEventKind::StateChanged,
            payload,
        };
        //json_diff
        self.emit(output);

        Ok(())
    }
}

impl Worker {
    pub fn setup(&mut self, event: InputEvent) -> Result<(), WorkerError> {
        if self.is_initialized() {
            return Err(WorkerError::AlreadyInitialized);
        }

        info!("{:?}", event.params);

        let params: SetupParams =
            serde_json::from_str(&event.params).map_err(|_| WorkerError::InvalidParams)?;

        let symbol: Symbol = Symbol::new(params.symbol);

        let data_path: String = format!("data/ticks_{}_data.cdb", symbol.as_str()); //Validator
        let index_path: String = format!("data/ticks_{}_index.cdbi", symbol.as_str()); //Validator

        let mut tick_cursor: CursorDB = CursorDB::new(data_path.as_str(), index_path.as_str())
            .map_err(|_| WorkerError::CursorInitFailed)?;

        let current_index: Record = tick_cursor
            .move_to_first()
            .map_err(|_| WorkerError::CursorInitFailed)?
            .ok_or(WorkerError::EmptyDataset)?;

        info!("{:?}", current_index);

        let state: WorkerState = WorkerState {
            status: WorkerStatus::Initialized,
            current_index,
            timeframes: HashMap::new(),
        };

        self.symbol = Some(symbol);
        self.tick_cursor = Some(tick_cursor);
        self.state = Some(state);

        Ok(())
    }
}

impl Worker {
    pub fn add_timeframe(&mut self, event: InputEvent) -> Result<(), WorkerError> {
        let state: &mut WorkerState = self.state.as_mut().ok_or(WorkerError::NotInitialized)?;

        // Parsear JSON
        let params: AddTimeframeParams =
            serde_json::from_str(&event.params).map_err(|_| WorkerError::InvalidParams)?;

        // Convertir string a enum Timeframe
        let timeframe: Timeframe =
            Timeframe::from_str(params.timeframe.as_str()).ok_or(WorkerError::InvalidTimeframe)?;

        let symbol: &Symbol = self.symbol.as_ref().ok_or(WorkerError::NotInitialized)?;

        let data_path: String = format!(
            "data/ohlcv_{}_{}_data.cdb",
            symbol.as_str(),
            timeframe.as_str()
        );
        let index_path: String = format!(
            "data/ohlcv_{}_{}_index.cdbi",
            symbol.as_str(),
            timeframe.as_str()
        );

        let mut timeframe_cursor: CursorDB = CursorDB::new(data_path.as_str(), index_path.as_str())
            .map_err(|_| WorkerError::CursorInitFailed)?;

        let current_record: Record = timeframe_cursor
            .current()
            .map_err(|_| WorkerError::CursorInitFailed)?
            .ok_or(WorkerError::EmptyDataset)?;

        let last_record: Record = timeframe_cursor
            .get_last_record()
            .map_err(|_| WorkerError::CursorInitFailed)?
            .ok_or(WorkerError::EmptyDataset)?;

        let tf_state: TimeframeState = TimeframeState::new(
            timeframe.clone(),
            current_record.timestamp,
            current_record.timestamp,
            last_record.timestamp,
        );

        state.timeframes.insert(timeframe, tf_state);

        self.timeframe_cursors.insert(timeframe, timeframe_cursor);

        self.emit_state()?;

        Ok(())
    }
}

impl Worker {
    pub fn next_timeframe_candle(&mut self, event: InputEvent) -> Result<(), WorkerError> {
        let state: &mut WorkerState = self.state.as_mut().ok_or(WorkerError::NotInitialized)?;

        let params: NextTimeframeParams =
            serde_json::from_str(&event.params).map_err(|_| WorkerError::InvalidParams)?;

        let timeframe: Timeframe =
            Timeframe::from_str(params.timeframe.as_str()).ok_or(WorkerError::InvalidTimeframe)?;

        let timeframe_cursor: &mut CursorDB = self
            .timeframe_cursors
            .get_mut(&timeframe)
            .ok_or(WorkerError::InvalidTimeframe)?;

        let timeframe_state: &mut TimeframeState = state
            .timeframes
            .get_mut(&timeframe)
            .ok_or(WorkerError::EmptyDataset)?;

        if timeframe_state.current_index == timeframe_state.last_index {
            info!("LAST INDEX CANDLE");
            return Ok(());
        }

        let current_record: Record = timeframe_cursor
            .next()
            .map_err(|_| WorkerError::CursorMethodError)?
            .ok_or(WorkerError::CursorEmpty)?;

        let decoded_payload: Ohlcv = Ohlcv::from_cbor(&current_record.payload)
            .map_err(|_| WorkerError::DeserializationError)?;

        timeframe_state.current_index = current_record.timestamp;

        timeframe_state.ohlcv_history.push(decoded_payload);

        self.emit_state()?;

        Ok(())
    }
}

impl Worker {
    pub fn back_timeframe_candle(&mut self, event: InputEvent) -> Result<(), WorkerError> {
        let state: &mut WorkerState = self.state.as_mut().ok_or(WorkerError::NotInitialized)?;

        let params: BackTimeframeParams =
            serde_json::from_str(&event.params).map_err(|_| WorkerError::InvalidParams)?;

        let timeframe: Timeframe =
            Timeframe::from_str(params.timeframe.as_str()).ok_or(WorkerError::InvalidTimeframe)?;

        let timeframe_cursor: &mut CursorDB = self
            .timeframe_cursors
            .get_mut(&timeframe)
            .ok_or(WorkerError::InvalidTimeframe)?;

        let timeframe_state: &mut TimeframeState = state
            .timeframes
            .get_mut(&timeframe)
            .ok_or(WorkerError::EmptyDataset)?;

        if timeframe_state.current_index == timeframe_state.first_index {
            info!("FIRST INDEX CANDLE");
            return Ok(());
        }

        let current_record: Record = timeframe_cursor
            .back()
            .map_err(|_| WorkerError::CursorMethodError)?
            .ok_or(WorkerError::CursorEmpty)?;

        timeframe_state.current_index = current_record.timestamp;

        timeframe_state.ohlcv_history.pop();

        self.emit_state()?;

        Ok(())
    }
}

pub async fn worker_loop(
    context_id: ContextId,
    mut rx: mpsc::Receiver<InputEvent>,
    tx_control: mpsc::Sender<ControlEvent>,
    tx_output: mpsc::Sender<OutputEvent>,
) {
    let mut worker: Worker = Worker::new(context_id.clone(), tx_control, tx_output);

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

                    Command::AddTimeframe => {
                        match worker.add_timeframe(event) {
                            Ok(_) => {
                                info!("AddTimeframe complete");
                            }
                            Err(e) => {
                                error!("AddTimeframe failed: {:?}", e);
                            }
                        }
                    }

                    Command::NextTimeframeCandle => {
                        match worker.next_timeframe_candle(event) {
                            Ok(_) => {
                                info!("NextTimeframeCandle complete");
                            }
                            Err(e) => {
                                error!("NextTimeframeCandle failed: {:?}", e);
                            }
                        }
                    }

                    Command::BackTimeframeCandle => {
                        match worker.back_timeframe_candle(event) {
                            Ok(_) => {
                                info!("BackTimeframeCandle complete");
                            }
                            Err(e) => {
                                error!("BackTimeframeCandle failed: {:?}", e);
                            }
                        }
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
