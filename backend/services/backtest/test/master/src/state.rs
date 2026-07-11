use crate::{
    common::{MasterStatus, SlaveId},
    slave::{ConnectedSlaveState, ExecutionState},
    slaves::engine::EngineState,
    snapshot::ReplaySnapshot,
};
use serde::Serialize;
use std::fmt;
use std::{collections::HashMap, sync::Arc};
use tickdb::{binary::BinaryFile, trade::Trade};
use tokio::sync::{Notify, RwLock};
use tracing::info;

pub type Tick = Trade;

#[derive(Debug, Clone, Copy)]
pub struct TickInfo {
    pub tick_index: usize,
    pub tick: Tick,
}

#[derive(Debug, Clone, Serialize, PartialEq)]
pub enum ReplayStatus {
    Stopped,
    Running,
    Stopping,
}

#[derive(Clone, Serialize)]
pub struct MasterState {
    pub status: MasterStatus,
    pub replay_status: ReplayStatus,
    pub slaves: HashMap<SlaveId, ConnectedSlaveState>,
    pub version: u64,
    #[serde(skip)]
    pub tick_data: Arc<BinaryFile>,
    pub tick_index: usize,

    #[serde(skip)]
    pub engine_state: Option<EngineState>,

    #[serde(skip)]
    pub execution_state: Option<ExecutionState>,
}

impl fmt::Debug for MasterState {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.debug_struct("MasterState")
            .field("status", &self.status)
            .field("replay_status", &self.replay_status)
            .field("slaves", &self.slaves)
            .field("version", &self.version)
            .field("tick_index", &self.tick_index)
            .field("engine_state", &self.engine_state)
            .field("execution_state", &self.execution_state)
            .finish()
    }
}

impl MasterState {
    #[inline]
    pub fn tick_by_index(&self, index: usize) -> Option<&Tick> {
        self.tick_data.trade(index)
    }

    #[inline]
    pub fn current_tick(&self) -> Option<&Tick> {
        self.tick_data.trade(self.tick_index)
    }

    #[inline]
    pub fn has_next_tick(&self) -> bool {
        self.tick_index + 1 < self.tick_data.len()
    }

    pub fn current_tick_info(&self) -> Option<TickInfo> {
        self.current_tick().copied().map(|tick: Tick| TickInfo {
            tick_index: self.tick_index,
            tick,
        })
    }
}

#[derive(Clone)]
pub struct AppState {
    pub master: Arc<RwLock<MasterState>>,

    // Despierta la ReplayTask cuando llega un EngineState o ExecutionState
    pub replay_notify: Arc<Notify>,
    pub engine_notify: Arc<Notify>,
    pub execution_notify: Arc<Notify>,

    pub engine_ack_notify: Arc<Notify>,
    pub execution_ack_notify: Arc<Notify>,
}

impl AppState {
    pub fn new(tick_data: Arc<BinaryFile>, snapshot: Option<ReplaySnapshot>) -> Self {
        info!("cargado snapshot, {:?}", snapshot);

        let (version, tick_index, engine_state, execution_state) = match snapshot {
            Some(snapshot) => (
                snapshot.version,
                snapshot.tick_index,
                snapshot.engine_state,
                snapshot.execution_state,
            ),

            None => (10, 0, None, None),
        };

        Self {
            master: Arc::new(RwLock::new(MasterState {
                status: MasterStatus::Pending,
                replay_status: ReplayStatus::Stopped,
                slaves: HashMap::new(),
                version,
                tick_data,
                tick_index,
                engine_state,
                execution_state,
            })),

            replay_notify: Arc::new(Notify::new()),
            engine_notify: Arc::new(Notify::new()),
            execution_notify: Arc::new(Notify::new()),

            engine_ack_notify: Arc::new(Notify::new()),
            execution_ack_notify: Arc::new(Notify::new()),
        }
    }
}
