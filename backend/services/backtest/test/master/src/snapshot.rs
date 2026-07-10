use crate::{slave::ExecutionState, slaves::engine::EngineState};
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct ReplaySnapshot {
    pub version: u64,
    pub tick_index: usize,

    pub engine_state: Option<EngineState>,
    pub execution_state: Option<ExecutionState>,
}
