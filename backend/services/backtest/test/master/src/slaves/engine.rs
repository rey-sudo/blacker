use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EngineState {
    pub data: String,
    pub tick_index: usize,
}
