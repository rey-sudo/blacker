use serde::{Deserialize, Serialize};

use crate::{clients::models::Clients };

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Tick {
    /// Exchange de origen
    pub exchange: Clients,

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


#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum Side {
    Buy,
    Sell,
}
