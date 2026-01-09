use pulsar::{Error as PulsarError, SerializeMessage, producer};

pub struct OutEvent {
    pub symbol: String,
    pub payload: Vec<u8>,
    #[allow(dead_code)]
    pub event_time: i64,
}

impl SerializeMessage for OutEvent {
    fn serialize_message(input: Self) -> Result<producer::Message, PulsarError> {
        Ok(producer::Message {
            payload: input.payload,
            partition_key: Some(input.symbol),
            ..Default::default()
        })
    }
}