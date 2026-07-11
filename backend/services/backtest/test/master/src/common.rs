use serde::{Deserialize, Serialize};

#[derive(Debug, Copy, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum SlaveId {
    Engine,
    Execution
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum MasterStatus {
    Pending,
    Unsync,
    Ready
}