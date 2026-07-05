use std::time::Instant;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum MasterState {
    Starting,
    WaitingForSlaves,
    Ready,
    Running,
    Error,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SlaveStatus {
    Offline,
    Online,
}

#[derive(Debug)]
pub struct Slave {
    pub connected: bool,
    pub status: SlaveStatus,
    pub last_seen: Instant,
}

impl Slave {
    pub fn new() -> Self {
        Self {
            connected: false,
            status: SlaveStatus::Offline,
            last_seen: Instant::now(),
        }
    }
}

#[derive(Debug)]
pub struct App {
    pub state: MasterState,

    pub tick: Slave,

    pub engine: Slave,
}

impl App {
    pub fn new() -> Self {
        Self {
            state: MasterState::Starting,

            tick: Slave::new(),

            engine: Slave::new(),
        }
    }

    pub fn update_state(&mut self) {
        if self.tick.connected && self.engine.connected {
            self.state = MasterState::Ready;
        } else {
            self.state = MasterState::WaitingForSlaves;
        }
    }
}