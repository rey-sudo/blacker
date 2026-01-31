use std::hash::{Hash, Hasher};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use uuid::{Uuid,};
use std::fmt;
use crate::common::candle::{Candle, Timeframe};

#[derive(Clone, Copy, Eq, PartialEq, Serialize, Deserialize)]
pub struct ContextId(pub Uuid);

impl ContextId {
    pub fn new() -> Self {
        Self(Uuid::now_v7())
    }
}

impl Hash for ContextId {
    fn hash<H: Hasher>(&self, state: &mut H) {
        self.0.as_bytes().hash(state)
    }
}

impl fmt::Display for ContextId {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.0)
    }
}

impl fmt::Debug for ContextId {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "ContextId({})", self.0)
    }
}


#[derive(Clone, Eq, PartialEq, Hash, Serialize, Deserialize)]
pub struct Symbol(pub String);

impl fmt::Display for Symbol {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(&self.0)
    }
}

impl fmt::Debug for Symbol {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(&self.0)
    }
}

#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct OhlcvCandle {
    pub symbol: Symbol,
    pub timeframe: Timeframe,

    pub open: f64,
    pub high: f64,
    pub low: f64,
    pub close: f64,
    pub volume: f64,

    /// Monotonic sequence per (symbol, timeframe)
    pub sequence: u64,

    /// Candle flags
    pub is_live: bool,
    pub is_closed: bool,

    /// Exchange timestamp (ms)
    pub timestamp: u64,
}

impl OhlcvCandle {
    pub fn is_retractable(&self) -> bool {
        self.is_live && !self.is_closed
    }
}

/// =======================
/// Indicadores
/// =======================

#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct IndicatorOutput {
    pub context_id: ContextId,

    pub indicator: IndicatorKind,

    /// Single-value indicator output
    pub value: f64,

    pub sequence: u64,

    pub is_live: bool,
    pub is_closed: bool,

    pub timestamp: u64,
}



/// =======================
/// Mensajes internos
/// =======================

#[derive(Clone, Serialize, Deserialize, Debug)]
#[serde(tag = "type", content = "data")]
pub enum Message {
    /// Initial OHLCV history (HTTP)
    OhlcvHistory {
        symbol: Symbol,
        timeframe: Timeframe,
        candles: Vec<OhlcvCandle>,
        cursor: Option<String>,
    },

    /// Live / closed OHLCV update
    Ohlcv(OhlcvCandle),

    /// Indicator output routed by context_id
    Indicator(IndicatorOutput),
}

/// =======================
/// WS Commands (inbound)
/// =======================

#[derive(Clone, Serialize, Deserialize, Debug)]
#[serde(tag = "type")]
pub enum WsCommand {
    #[serde(rename = "open_chart")]
    OpenChart {
        symbol: Symbol,
        timeframe: Timeframe,
        cursor: Option<String>,
    },

    #[serde(rename = "change_symbol")]
    ChangeSymbol {
        context_id: ContextId,
        symbol: Symbol,
    },

    #[serde(rename = "change_timeframe")]
    ChangeTimeframe {
        context_id: ContextId,
        timeframe: Timeframe,
    },

    #[serde(rename = "add_indicator")]
    AddIndicator {
        context_id: ContextId,
        indicator: IndicatorKind,
    },

    #[serde(rename = "remove_indicator")]
    RemoveIndicator {
        context_id: ContextId,
        indicator: IndicatorKind,
    },
}

/// =======================
/// Helpers
/// =======================

impl Message {
    pub fn is_live(&self) -> bool {
        match self {
            Message::Ohlcv(c) => c.is_live,
            Message::Indicator(i) => i.is_live,
            _ => false,
        }
    }

    pub fn is_closed(&self) -> bool {
        match self {
            Message::Ohlcv(c) => c.is_closed,
            Message::Indicator(i) => i.is_closed,
            _ => true,
        }
    }
}

/// Shared message type across tasks
pub type SharedMessage = Arc<Message>;


#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct IndicatorParams {
    pub period: Option<u32>,

    // extensible sin romper
    pub fast_period: Option<u32>,
    pub slow_period: Option<u32>,
    pub signal_period: Option<u32>,
}


impl Default for IndicatorParams {
    fn default() -> Self {
        Self {
            period: None,
            fast_period: None,
            slow_period: None,
            signal_period: None,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum IndicatorKind {
    EMA,
    RSI
}


#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct IndicatorSpec {
    /// ID único del indicador dentro del chart
    pub indicator_id: Uuid,

    /// Tipo de indicador
    pub kind: IndicatorKind,

    /// Parámetros del indicador
    pub params: IndicatorParams,
}


#[derive(Debug, Deserialize)]
pub struct CandlePage {
    pub data: Vec<Candle>,
    pub first: i64,
    pub cursor: i64,
}