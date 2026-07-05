use crate::common::SlaveId;
use chrono::Utc;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SlaveState {
    Offline,
    Online,
}

#[derive(Debug)]
pub struct Slave {
    pub id: SlaveId,
    pub connected: bool,
    pub state: SlaveState,
    pub last_ack: i64,
}

impl Slave {
    pub fn new(slave_id: SlaveId) -> Self {
        Self {
            id: slave_id,
            connected: false,
            state: SlaveState::Offline,
            last_ack: Utc::now().timestamp_millis(),
        }
    }
}
