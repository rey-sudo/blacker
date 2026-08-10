use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExecutionState {
    pub data: String,
    pub tick_index: usize,
}

impl Default for ExecutionState {
    fn default() -> Self {
        Self {
            data: "".to_string(),
            tick_index: 0,
        }
    }
}