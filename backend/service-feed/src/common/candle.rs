use pulsar::{DeserializeMessage, Payload, SerializeMessage, producer};

/// Represents a finalized or in-progress 1-minute OHLCV candle.
/// All timestamps are expressed as Unix milliseconds, where
/// `open_time` is aligned to the start of the minute and
/// `close_time` marks the inclusive end of the interval.
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, sqlx::FromRow)]
pub struct Candle {
    pub symbol: String,

    /// Inclusive start time of the candle (Unix ms, minute-aligned)
    pub open_time: i64,
    /// Inclusive end time of the candle (Unix ms)
    pub close_time: i64,

    pub open: f64,
    pub high: f64,
    pub low: f64,
    pub close: f64,
    pub volume: f64,
}

impl SerializeMessage for Candle {
    fn serialize_message(candle: Self) -> Result<producer::Message, pulsar::Error> {
        let payload: Vec<u8> = serde_json::to_vec(&candle)
            .map_err(|e: serde_json::Error| pulsar::Error::Custom(e.to_string()))?;

        Ok(producer::Message {
            payload,
            ..Default::default()
        })
    }
}

impl DeserializeMessage for Candle {
    type Output = Result<Candle, serde_json::Error>;

    fn deserialize_message(payload: &Payload) -> Self::Output {
        serde_json::from_slice(&payload.data)
    }
}
