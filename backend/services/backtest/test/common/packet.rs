pub enum Packet {
    Hello {
        id: String,
    },

    Ping,

    Pong,

    Command {
        cmd: String,
    },

    Status {
        cpu: f32,
        ram: u64,
    },
}