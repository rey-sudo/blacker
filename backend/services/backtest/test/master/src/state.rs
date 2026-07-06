use crate::{common::SlaveId, slave::ConnectedSlaveState};
use serde::Serialize;
use std::{collections::HashMap, sync::Arc};
use tokio::sync::RwLock;

#[derive(Debug, Clone, Serialize)]
pub enum MasterStatus {
    Pending,
    Ready,
    Starting,
    Running,
    Degraded,
    Maintenance,
    Stopping,
}

#[derive(Debug, Clone, Serialize)]
pub struct MasterState {
    pub status: MasterStatus,
    pub slaves: HashMap<SlaveId, ConnectedSlaveState>,
}

#[derive(Clone)]
pub struct AppState {
    pub master: Arc<RwLock<MasterState>>,
}

impl AppState {
    pub fn new() -> Self {
        Self {
            master: Arc::new(RwLock::new(MasterState {
                status: MasterStatus::Starting,
                slaves: HashMap::new(),
            })),
        }
    }
}
