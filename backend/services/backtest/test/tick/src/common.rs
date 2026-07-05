use serde::{Serialize, Deserialize};

#[derive(Serialize, Deserialize)]
pub enum Packet {
    Hello {
        id: String,
    },
}