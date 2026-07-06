use serde::Serialize;
use std::time::Instant;

#[derive(Debug, Clone, Serialize)]
pub struct ConnectedSlaveState {
    pub connected: bool,
    #[serde(skip)]
    pub last_seen: Instant,
    pub status: String,
}