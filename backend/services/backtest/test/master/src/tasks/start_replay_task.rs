use crate::state::{AppState, MasterState, ReplayStatus};
use std::time::Duration;
use tokio::{
    sync::{RwLockWriteGuard, mpsc},
    time,
};
use tracing::info;


#[derive(Debug, Clone)]
pub struct EngineState {
    pub version: u64,
    pub tick_index: usize,
}

#[derive(Debug, Clone)]
pub struct ExecutionState {
    pub version: u64,
    pub tick_index: usize,
}

#[derive(Debug, Clone)]
pub enum ReplayEvent {
    EngineState(EngineState),
    ExecutionState(ExecutionState),
}

pub enum ReplayStep {
    SendTick,
    WaitEngine,
    WaitExecution,
}

pub fn start_replay_task(state: AppState, mut replay_rx: mpsc::Receiver<ReplayEvent>) {
    tokio::spawn(async move {
        let mut step: ReplayStep = ReplayStep::SendTick;

        loop {
            match step {
                ReplayStep::SendTick => {
                    let mut master: RwLockWriteGuard<'_, MasterState> = state.master.write().await;

                    if master.replay_status != ReplayStatus::Running {
                        drop(master);

                        tokio::time::sleep(Duration::from_millis(100)).await;

                        continue;
                    }

                    let Some(tick) = master.current_tick() else {
                        master.replay_status = ReplayStatus::Stopped;

                        tracing::info!("Replay finished.");

                        continue;
                    };

                    tracing::info!(tick_index = master.tick_index, id = tick.id, "Send Tick");

                    // TODO:
                    // publish tick to Pulsar

                    step = ReplayStep::WaitEngine;
                }

                ReplayStep::WaitEngine => match replay_rx.recv().await {
                    Some(ReplayEvent::EngineState(engine_state)) => {
                        tracing::info!(version = engine_state.version, "EngineState received");

                        step = ReplayStep::WaitExecution;
                    }

                    Some(_) => {}

                    None => break,
                },

                ReplayStep::WaitExecution => match replay_rx.recv().await {
                    Some(ReplayEvent::ExecutionState(execution_state)) => {
                        tracing::info!(
                            version = execution_state.version,
                            "ExecutionState received"
                        );

                        let mut master = state.master.write().await;

                        //PERSISTENCE

                        master.tick_index += 1;

                        step = ReplayStep::SendTick;
                    }

                    Some(_) => {}

                    None => break,
                },
            }
        }
    });
}
