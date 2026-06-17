use bytemuck::{Pod, Zeroable};
use serde::{Deserialize, Serialize};
use pulsar::{producer, Error as PulsarError, SerializeMessage};

#[repr(C)]
#[derive(Clone, Copy, Debug, Zeroable, Pod, Serialize, Deserialize)]
pub struct Trade {
    pub trade_id: u64,
    pub timestamp_ms: u64,
    pub price: u64,
    pub qty: u64,
    /// 0=BUY, 1=SELL
    pub side: u8, 
    pub _padding: [u8; 7],
}

impl SerializeMessage for Trade {
    fn serialize_message(input: Self) -> Result<producer::Message, PulsarError> {
        Ok(producer::Message {
            payload: bytemuck::bytes_of(&input).to_vec(),
            ..Default::default()
        })
    }
}