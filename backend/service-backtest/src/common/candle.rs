use serde::{Deserialize, Deserializer, Serialize};
use crate::common::cbor::{from_cbor_bytes, to_cbor_bytes};

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


impl Ohlcv {
    pub fn to_cbor(&self) -> Result<Vec<u8>, ciborium::ser::Error<std::io::Error>> {
        to_cbor_bytes(self)
    }

    pub fn from_cbor(
        bytes: &[u8],
    ) -> Result<Self, ciborium::de::Error<std::io::Error>> {
        from_cbor_bytes(bytes)
    }
}