use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EngineState {
    pub data: String,
    pub version: u64,
    pub tick_index: usize,
}
