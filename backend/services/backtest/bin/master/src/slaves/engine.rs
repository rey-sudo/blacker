use serde::{Deserialize, Serialize};
use serde_json::Value;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EngineStateMessage {
    pub boot_id: String,
    pub tick_index: usize,
    pub time: u64,
    pub timeframes: Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EngineState {
    pub tick_index: usize,
    pub time: u64,
    pub timeframes: Value,
}


impl From<EngineStateMessage> for EngineState {
    fn from(message: EngineStateMessage) -> Self {
        Self {
            tick_index: message.tick_index,
            time: message.time,
            timeframes: message.timeframes,
        }
    }
}