use crate::common::candle::Ohlcv;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum Timeframe {
    M1,
    M5,
    M15,
    M30,
    H1,
    H4,
    D1,
    MN,
}

impl Timeframe {
    /// Devuelve el string representativo de cada timeframe
    pub fn as_str(&self) -> &'static str {
        match self {
            Timeframe::M1 => "M1",
            Timeframe::M5 => "M5",
            Timeframe::M15 => "M15",
            Timeframe::M30 => "M30",
            Timeframe::H1 => "H1",
            Timeframe::H4 => "H4",
            Timeframe::D1 => "D1",
            Timeframe::MN => "MN",
        }
    }

    pub fn from_str(s: &str) -> Option<Self> {
        match s {
            "M1" => Some(Timeframe::M1),
            "M5" => Some(Timeframe::M5),
            "M15" => Some(Timeframe::M15),
            "M30" => Some(Timeframe::M30),
            "H1" => Some(Timeframe::H1),
            "H4" => Some(Timeframe::H4),
            "D1" => Some(Timeframe::D1),
            "MN" => Some(Timeframe::MN),
            _ => None,
        }
    }

    /// Devuelve duración aproximada en segundos
    pub fn as_seconds(&self) -> u64 {
        match self {
            Timeframe::M1 => 60,
            Timeframe::M5 => 300,
            Timeframe::M15 => 900,
            Timeframe::M30 => 1800,
            Timeframe::H1 => 3600,
            Timeframe::H4 => 14_400,
            Timeframe::D1 => 86_400,
            Timeframe::MN => 2_592_000, // 30 días aproximados
        }
    }
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct TimeframeState {
    pub kind: Timeframe,

    pub current_index: i64,

    pub ohlcv_history: Vec<Ohlcv>,
}

impl TimeframeState {
    pub fn new(kind: Timeframe, current_index: i64) -> Self {
        Self {
            kind,
            current_index,
            ohlcv_history: Vec::new(),
        }
    }
}

//pub current_candle: u64,

//pub candle_buffer: CandleBuffer,

//pub parallel_layers: Vec<Vec<IndicatorState>>,

//pub sequential_indicators: Vec<IndicatorState>,
