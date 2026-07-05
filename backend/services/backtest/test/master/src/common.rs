use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum SlaveId {
    Tick,
    Engine,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum Packet {
    /// Primer mensaje que envía un slave al conectarse.
    Hello {
        id: SlaveId,
    },

    /// Heartbeat
    Ping,

    /// Respuesta al heartbeat
    Pong,

    /// El master envía una orden.
    Command {
        command: String,
    },

    /// El slave informa su estado.
    State {
        state: String,
    },

    /// Mensaje de error.
    Error {
        message: String,
    },
}