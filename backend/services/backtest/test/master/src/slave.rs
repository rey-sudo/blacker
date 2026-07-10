use crate::common::SlaveId;
use serde::{Deserialize, Serialize};
use std::time::Instant;

#[derive(Debug, Clone, Serialize)]
pub struct ConnectedSlaveState {
    pub id: SlaveId,
    pub connected: bool,
    #[serde(skip)]
    pub last_seen: Instant,
    pub status: String,
    pub version: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExecutionState {
    pub version: u64,
    pub tick_index: usize,
}
