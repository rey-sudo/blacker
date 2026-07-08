use serde::Serialize;
use std::time::Instant;
use crate::common::SlaveId;

#[derive(Debug, Clone, Serialize)]
pub struct ConnectedSlaveState {
    pub id: SlaveId,
    pub connected: bool,
    #[serde(skip)]
    pub last_seen: Instant,
    pub status: String,
    pub version: u64,
}

#[derive(Debug, Clone)]
pub struct EngineState {
    pub version: u64,
    pub tick_index: usize,
}

#[derive(Debug, Clone)]
pub struct ExecutionState {
    pub version: u64,
    pub tick_index: usize,
}