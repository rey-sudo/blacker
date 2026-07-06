use std::time::Instant;
use std::{collections::HashMap, sync::Arc};
use tokio::sync::RwLock;

#[derive(Debug, Clone)]
pub struct SlaveState {
    pub connected: bool,
    pub last_seen: Instant,
    pub status: String,
}

#[derive(Debug, Clone)]
pub enum MasterStatus {
    Pending,
    Ready,
    Starting,
    Running,
    Degraded,
    Maintenance,
    Stopping,
}

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