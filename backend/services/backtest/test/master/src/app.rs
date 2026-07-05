use crate::{common::SlaveId, master::MasterState, slave::Slave};

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

            tick: Slave::new(SlaveId::Tick),

            engine: Slave::new(SlaveId::Engine),
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