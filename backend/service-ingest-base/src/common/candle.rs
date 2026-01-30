use crate::common::tick::Tick;
use pulsar::{producer, SerializeMessage};
use serde::{Deserialize, Serialize};
use std::{fmt, str::FromStr};


#[derive(Clone, Copy, Eq, PartialEq, Hash, Serialize, Deserialize)]
pub enum Timeframe {
    S1,
    S5,
    S15,
    M1,
    M5,
    M15,
    H1,
    H4,
    D1,
}

impl FromStr for Timeframe {
    type Err = ();

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s {
            "1s" => Ok(Timeframe::S1),
            "5s" => Ok(Timeframe::S5),
            "15s" => Ok(Timeframe::S15),

            "1m" => Ok(Timeframe::M1),
            "5m" => Ok(Timeframe::M5),
            "15m" => Ok(Timeframe::M15),

            "1h" => Ok(Timeframe::H1),
            "4h" => Ok(Timeframe::H4),

            "1d" => Ok(Timeframe::D1),
            _ => Err(()),
        }
    }
}

impl fmt::Display for Timeframe {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let s = match self {
            Timeframe::S1 => "1s",
            Timeframe::S5 => "5s",
            Timeframe::S15 => "15s",

            Timeframe::M1 => "1m",
            Timeframe::M5 => "5m",
            Timeframe::M15 => "15m",

            Timeframe::H1 => "1h",
            Timeframe::H4 => "4h",

            Timeframe::D1 => "1d",
        };
        f.write_str(s)
    }
}

impl fmt::Debug for Timeframe {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        fmt::Display::fmt(self, f)
    }
}

impl Timeframe {
    pub fn seconds(&self) -> u64 {
        match self {
            Timeframe::S1 => 1,
            Timeframe::S5 => 5,
            Timeframe::S15 => 15,

            Timeframe::M1 => 60,
            Timeframe::M5 => 5 * 60,
            Timeframe::M15 => 15 * 60,

            Timeframe::H1 => 60 * 60,
            Timeframe::H4 => 4 * 60 * 60,

            Timeframe::D1 => 24 * 60 * 60,
        }
    }
}



/// Represents a finalized or in-progress 1-minute OHLCV candle.
/// All timestamps are expressed as Unix milliseconds, where
/// `open_time` is aligned to the start of the minute and
/// `close_time` marks the inclusive end of the interval.
#[derive(Debug, Clone, serde::Serialize)]
pub struct Candle {
    pub symbol: String,
    pub timeframe: String,

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

impl Candle {
    /// Create a new 1-minute candle from the first tick of the minute
    pub fn new(timeframe: &str, symbol: &str, tick: &Tick, minute_ts: i64) -> Self {
        Self {
            symbol: symbol.to_string(),
            timeframe: timeframe.to_string(),

            // Minute boundaries
            open_time: minute_ts,
            close_time: minute_ts + 60_000 - 1, // inclusive close

            open: tick.price,
            high: tick.price,
            low: tick.price,
            close: tick.price,
            volume: tick.quantity,
        }
    }

    /// Update candle with an incoming tick
    pub fn update(&mut self, tick: &Tick) {
        self.high = self.high.max(tick.price);
        self.low = self.low.min(tick.price);
        self.close = tick.price;
        self.volume += tick.quantity;
    }
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
