use crate::common::SlaveId;
use serde::Serialize;
use std::sync::Arc;
use tokio::sync::RwLock;

#[derive(Debug, Clone, Serialize)]
pub enum SlaveStatus {
    Pending,
    Ready,
}

#[derive(Debug, Clone, Serialize)]
pub struct SlaveState {
    pub id: SlaveId,
    pub status: SlaveStatus,
    pub version: u64,
}

#[derive(Clone)]
pub struct AppState {
    pub slave: Arc<RwLock<SlaveState>>,
}

impl AppState {
    pub fn new() -> Self {
        Self {
            slave: Arc::new(RwLock::new(SlaveState {
                id: SlaveId::Tick,
                status: SlaveStatus::Pending,
                version: 0,
            })),
        }
    }
}
