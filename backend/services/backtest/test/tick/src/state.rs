use serde::Serialize;
use std::sync::Arc;
use tokio::sync::RwLock;
use crate::common::SlaveId;

#[derive(Debug, Clone, Serialize)]
pub enum SlaveStatus {
    Pending,
    Ready,
}

#[derive(Debug, Clone, Serialize)]
pub struct SlaveState {
    pub id: SlaveId,
    pub status: SlaveStatus,
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
            })),
        }
    }
}
