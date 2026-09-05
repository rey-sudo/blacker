use crate::models::Tick;
use anyhow::Result;
use rust_decimal::Decimal;
use serde::Deserialize;
use tracing::{info, warn};

static FACTOR: Decimal = Decimal::from_parts(100_000_000, 0, 0, false, 0);

#[derive(Debug, Deserialize)]
struct BinanceAck {
    result: Option<serde_json::Value>,
    id: Option<u64>,
}
/**
 {
  "e": "trade",
  "E": 1785276941124,
  "T": 1785276941123,
  "s": "BTCUSDT",
  "t": 7935134524,
  "p": "63977.10",
  "q": "0.001",
  "X": "MARKET",
  "m": false,
  "st": 1
}
 */
#[derive(Debug, Deserialize)]
struct BinanceTrade {
    #[serde(rename = "e")]
    event_type: String,

    #[serde(rename = "E")]
    event_time: u64,

    #[serde(rename = "T")]
    trade_time: u64,

    #[serde(rename = "s")]
    symbol: String,

    #[serde(rename = "t")]
    trade_id: u64,

    #[serde(rename = "p")]
    price: String,

    #[serde(rename = "q")]
    qty: String,

    #[serde(rename = "X")]
    execution_type: String,

    #[serde(rename = "m")]
    is_buyer_maker: bool,
}

fn decimal_to_u64(value: &str) -> anyhow::Result<u64> {
    let decimal: Decimal = value.parse()?;

    Ok((decimal * FACTOR).round().try_into()?)
}

/// Parses Binance Futures @trade messages into Tick.
///
/// Subscription ACKs and other non-trade messages return an empty vector.
pub fn parse_binance_trade(text: &str) -> Result<Vec<Tick>> {
    let value: serde_json::Value = serde_json::from_str(text)?;

    // ACK del SUBSCRIBE
    if value.get("result").is_some() {
        return Ok(Vec::new());
    }

    // Ignorar cualquier cosa que no sea un trade
    if value.get("e").and_then(|v| v.as_str()) != Some("trade") {
        return Ok(Vec::new());
    }

    let trade: BinanceTrade = serde_json::from_value(value)?;
    
    if trade.price == "0" || trade.qty == "0" {
        warn!("Ignoring invalid trade: {}", text);
        return Ok(Vec::new());
    }

    Ok(vec![Tick {
        source: "binance".to_string(),

        symbol: trade.symbol,

        id: trade.trade_id.to_string(),

        time: trade.trade_time,

        price: decimal_to_u64(&trade.price)?,

        qty: decimal_to_u64(&trade.qty)?,

        is_buyer_maker: trade.is_buyer_maker as u8,
    }])
}
