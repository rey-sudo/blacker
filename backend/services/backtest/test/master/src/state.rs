use crate::{
    common::{MasterStatus, SlaveId},
    slave::{ConnectedSlaveState, EngineState, ExecutionState},
};
use serde::Serialize;
use std::{collections::HashMap, sync::Arc};
use tickdb::{binary::BinaryFile, trade::Trade};
use tokio::sync::{Notify, RwLock};

#[derive(Clone, Serialize, PartialEq)]
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

impl MasterState {
    #[inline]
    pub fn trade(&self, index: usize) -> Option<&Trade> {
        self.tick_data.trade(index)
    }

    #[inline]
    pub fn current_tick(&self) -> Option<&Trade> {
        self.tick_data.trade(self.tick_index)
    }

    #[inline]
    pub fn has_next_tick(&self) -> bool {
        self.tick_index + 1 < self.tick_data.len()
    }
}

#[derive(Clone)]
pub struct AppState {
    pub master: Arc<RwLock<MasterState>>,

    // Despierta la ReplayTask cuando llega un EngineState o ExecutionState
    pub replay_notify: Arc<Notify>,
    pub engine_ack_notify: Arc<Notify>,
    pub execution_ack_notify: Arc<Notify>,
}

impl AppState {
    pub fn new(tick_data: Arc<BinaryFile>) -> Self {
        Self {
            master: Arc::new(RwLock::new(MasterState {
                status: MasterStatus::Pending,
                replay_status: ReplayStatus::Stopped,
                slaves: HashMap::new(),
                version: 10,
                tick_data,
                tick_index: 0,
                engine_state: None,
                execution_state: None,
            })),

            replay_notify: Arc::new(Notify::new()),
            engine_ack_notify: Arc::new(Notify::new()),
            execution_ack_notify: Arc::new(Notify::new()),
        }
    }
}
