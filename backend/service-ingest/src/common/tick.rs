use serde::{Deserialize, Serialize};

use crate::{clients::client::Client };

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Tick {

    pub exchange: Client,


    pub symbol: String,


    pub price: f64,


    pub quantity: f64,


    pub side: Side,

    /// Timestamp Unix millis
    pub ts: i64,
}


#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum Side {
    Buy,
    Sell,
}
