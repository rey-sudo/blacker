use crate::{
    common::{MasterStatus, SlaveId},
    slave::ConnectedSlaveState,
};
use serde::Serialize;
use std::{collections::HashMap, sync::Arc};
use tickdb::{binary::BinaryFile, trade::Trade};
use tokio::sync::RwLock;

#[derive(Clone, Serialize)]
pub struct MasterState {
    pub status: MasterStatus,
    pub slaves: HashMap<SlaveId, ConnectedSlaveState>,
    pub version: u64,
    #[serde(skip)]
    pub tick_data: Arc<BinaryFile>,
    pub tick_index: usize,
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
}

impl AppState {
    pub fn new(tick_data: Arc<BinaryFile>) -> Self {
        Self {
            master: Arc::new(RwLock::new(MasterState {
                status: MasterStatus::Pending,
                slaves: HashMap::new(),
                version: 10,
                tick_data,
                tick_index: 0,
            })),
        }
    }
}
