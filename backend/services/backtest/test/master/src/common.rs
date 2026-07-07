use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum SlaveId {
    Engine,
    Execution
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum MasterStatus {
    Pending,
    Unsync,
    Ready
}