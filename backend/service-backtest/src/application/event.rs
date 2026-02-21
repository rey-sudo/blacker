use crate::application::worker::Command;
use pulsar::{DeserializeMessage, Error as PulsarError, Payload, SerializeMessage, producer};
use serde::{Deserialize, Serialize};

pub type ContextId = String;

#[derive(Debug, Deserialize)]
pub struct InputEvent {
    pub context_id: ContextId,
    pub command: Command,
    pub params: String,
}

#[derive(Debug, Serialize, Clone, Copy)]
#[serde(rename_all = "snake_case")]
pub enum OutputEventKind {
    SetupCompleted,
    TimeframeAdded,
    TickProcessed,
    IndicatorUpdated,
    Error,
}

#[derive(Debug, Serialize)]
pub struct OutputEvent {
    pub context_id: ContextId,
    pub kind: OutputEventKind,
    pub payload: Vec<u8>,
}

impl DeserializeMessage for InputEvent {
    type Output = Result<InputEvent, serde_json::Error>;

    fn deserialize_message(payload: &Payload) -> Self::Output {
        serde_json::from_slice(&payload.data)
    }
}

impl SerializeMessage for OutputEvent {
    fn serialize_message(input: Self) -> Result<producer::Message, PulsarError> {
        Ok(producer::Message {
            payload: input.payload,
            partition_key: Some(input.context_id),
            ..Default::default()
        })
    }
}

pub enum ControlEvent {
    WorkerFinished(ContextId),
    DeleteConfirmed(ContextId),
}
