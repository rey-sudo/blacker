use crate::{
    common::{MasterStatus, SlaveId},
    slave::ConnectedSlaveState,
};
use serde::Serialize;
use std::{collections::HashMap, sync::Arc};
use tokio::sync::RwLock;

#[derive(Debug, Clone, Serialize)]
pub struct MasterState {
    pub status: MasterStatus,
    pub slaves: HashMap<SlaveId, ConnectedSlaveState>,
    pub version: u64,
}

#[derive(Clone)]
pub struct AppState {
    pub master: Arc<RwLock<MasterState>>,
}

impl AppState {
    pub fn new() -> Self {
        Self {
            master: Arc::new(RwLock::new(MasterState {
                status: MasterStatus::Pending,
                slaves: HashMap::new(),
                version: 10
            })),
        }
    }
}
