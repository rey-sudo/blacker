// BLACKER
// Copyright (C) 2026 Juan José Caballero Rey
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation version 3 of the License.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program. If not, see <https://www.gnu.org/licenses/>.

use crate::models::Tick;
use anyhow::Result;
use chrono::{DateTime, Utc};
use rust_decimal::Decimal;
use serde::Deserialize;
use tracing::info;
use xxhash_rust::xxh3::xxh3_64;

static FACTOR: Decimal = Decimal::from_parts(100_000_000, 0, 0, false, 0);

/**
* {
       "id": "05e4dc7a0000000200000012",
       "side": "SELL",
       "size": "0.0985",
       "price": "64100",
       "type": "LIMIT",
       "createdAt": "2026-07-24T21:47:35.074Z",
       "createdAtHeight": "98884730"
   }

   {
       "id": "05e4e8f80000000200000008",
       "side": "BUY",
       "size": "0.0165",
       "price": "64113",
       "type": "LIMIT",
       "createdAt": "2026-07-24T22:25:47.898Z"
   }
*/
#[derive(Debug, Deserialize)]
struct DydxTrade {
    pub id: String,

    pub side: String,

    pub size: String,

    pub price: String,

    #[serde(rename = "type")]
    pub order_type: String,

    #[serde(rename = "createdAt")]
    pub created_at: DateTime<Utc>,

    #[serde(rename = "createdAtHeight")]
    pub created_at_height: Option<String>,
}

#[derive(Debug, Deserialize)]
struct DydxContents {
    pub trades: Vec<DydxTrade>,
}

#[derive(Debug, Deserialize)]
struct DydxWsMessage {
    #[serde(rename = "type")]
    pub msg_type: String,

    pub connection_id: String,

    pub message_id: u64,

    pub channel: String,

    pub id: String,

    pub version: Option<String>,

    pub contents: DydxContents,
}

fn decimal_to_u64(value: &str) -> anyhow::Result<u64> {
    let decimal: Decimal = value.parse()?;

    Ok((decimal * FACTOR).round().try_into()?)
}

#[inline]
fn trade_id_to_u64(id: &str) -> anyhow::Result<u64> {
    Ok(xxh3_64(id.as_bytes()))
}

#[inline]
fn side_to_u8(side: &str) -> u8 {
    match side {
        "BUY" => 0,
        "SELL" => 1,
        _ => 255,
    }
}

#[derive(Debug, Deserialize)]
struct MessageType {
    #[serde(rename = "type")]
    msg_type: String,
}

pub fn parse_dydx_trade(text: &str) -> Result<Vec<Tick>> {
    let msg_type: MessageType = serde_json::from_str(text)?;

    match msg_type.msg_type.as_str() {
        "channel_data" => {
            info!("tick  channel_data");

            let message: DydxWsMessage = serde_json::from_str(text)?;

            let mut ticks: Vec<Tick> = Vec::with_capacity(message.contents.trades.len());

            for trade in message.contents.trades {
                let tick: Tick = Tick {
                    source: "dydx".to_string(),

                    id: trade_id_to_u64(&trade.id)?,

                    time: trade.created_at.timestamp_millis() as u64,

                    price: decimal_to_u64(&trade.price)?,

                    qty: decimal_to_u64(&trade.size)?,

                    is_buyer_maker: side_to_u8(&trade.side),
                };

                ticks.push(tick);
            }

            Ok(ticks)
        }

        "connected" => {
            println!("Connected");
            return Ok(Vec::new());
        }

        "subscribed" => {
            println!("Subscribed");
            return Ok(Vec::new());
        }

        "error" => {
            println!("Exchange error: {text}");
            return Ok(Vec::new());
        }

        other => {
            println!("Unknown message type: {other}");
            return Ok(Vec::new());
        }
    }
}
