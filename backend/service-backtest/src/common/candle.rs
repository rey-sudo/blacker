use serde::{Deserialize, Deserializer, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Ohlcv {
    pub timestamp: u64,
    pub first_tick_ts: u64, // primer tick real (nano)
    pub last_tick_ts: u64,  // último tick real (nano)
    pub open: f64,
    pub high: f64,
    pub low: f64,
    pub close: f64,
    pub volume: f64,
}


