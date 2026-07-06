use std::{collections::HashMap, sync::Arc};
use serde::Serialize;
use tokio::sync::RwLock;
use crate::slave::SlaveState;


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
    pub slaves: HashMap<String, SlaveState>,
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
