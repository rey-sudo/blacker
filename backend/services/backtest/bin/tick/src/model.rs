use bytemuck::{Pod, Zeroable};
use pulsar::{Error as PulsarError, SerializeMessage, producer};
use serde::{Deserialize, Serialize};

#[repr(C)]
#[derive(Clone, Copy, Debug, Zeroable, Pod, Serialize, Deserialize)]
pub struct Trade {
    pub trade_id: u64,
    pub timestamp_ms: u64,
    pub price: u64,
    pub qty: u64,
    pub side: u8,

    #[serde(skip)]
    pub _padding: [u8; 7],
}

impl SerializeMessage for Trade {
    fn serialize_message(input: Self) -> Result<producer::Message, PulsarError> {
        Ok(producer::Message {
            payload: rmp_serde::to_vec(&input)
                .map_err(|e: rmp_serde::encode::Error| PulsarError::Custom(e.to_string()))?,
            ..Default::default()
        })
    }
}
