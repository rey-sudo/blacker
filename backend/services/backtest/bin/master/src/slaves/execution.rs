use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExecutionState {
    pub data: String,
    pub tick_index: usize,
}
