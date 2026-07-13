use serde::{Deserialize, Serialize};
use serde_json::Value;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EngineState {
    pub tick_index: usize,
    pub time: u64,
    pub timeframes: Value,
}
