use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Series {
    pub id: String,
    pub kind: String,
    pub level: u32,
    pub live: Value,
    pub params: HashMap<String, Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Timeframe {
    pub id: String,
    pub series: HashMap<String, Series>,
    pub timeframe_ms: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EngineState {
    pub tick_index: usize,
    pub time: u64,
    pub timeframes: HashMap<String, Timeframe>,
}

impl Default for EngineState {
    fn default() -> Self {
        Self {
            tick_index: 0,
            time: 0,
            timeframes: HashMap::new(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EngineStateMessage {
    pub boot_id: String,
    pub tick_index: usize,
    pub time: u64,
    pub timeframes: HashMap<String, Timeframe>,
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
