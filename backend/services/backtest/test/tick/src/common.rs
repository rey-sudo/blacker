use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum SlaveId {
    Tick,
    Engine
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum MasterStatus {
    Pending,
    Unsync,
    Ready
}