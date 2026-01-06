use serde::{Deserialize, Serialize};


#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Tick {
    /// Exchange de origen
    pub exchange: Exchange,

    /// Símbolo normalizado (ej: BTCUSDT)
    pub symbol: String,

    /// Precio de ejecución
    pub price: f64,

    /// Cantidad ejecutada
    pub quantity: f64,

    /// Lado de la ejecución
    pub side: Side,

    /// Timestamp en Unix millis
    pub ts: i64,
}

/// =======================
/// EXCHANGE
/// =======================

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum Exchange {
    Binance,
    Kraken,
    Coinbase,
}

/// =======================
/// SIDE
/// =======================

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum Side {
    Buy,
    Sell,
}
