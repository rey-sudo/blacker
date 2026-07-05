use serde::{Serialize, Deserialize};

#[derive(Debug, Serialize, Deserialize)]
pub enum Packet {
    Hello {
        id: String,
    },
}