use crate::state::{AppState, MasterState, ReplayStatus};
use tokio::sync::RwLockWriteGuard;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum ReplayStep {
    PublishTick,
    WaitEngine,
    WaitExecution,
}

pub fn start_replay_task(state: AppState) {
    tokio::spawn(async move {
        let mut step = ReplayStep::PublishTick;

        loop {
            state.replay_notify.notified().await;

            let mut master: RwLockWriteGuard<'_, MasterState> = state.master.write().await;

            if master.replay_status != ReplayStatus::Running {
                step = ReplayStep::PublishTick;
                continue;
            }

            match step {
                ReplayStep::PublishTick => {
                    match master.current_tick() {
                        Some(tick) => {
                            tracing::info!(
                                tick_index = master.tick_index,
                                id = tick.id,
                                "Publish Tick"
                            );

                            // TODO:
                            // publish_tick(tick).await;

                            step = ReplayStep::WaitEngine;
                        }

                        None => {
                            master.replay_status = ReplayStatus::Stopped;
                        }
                    }
                }

                ReplayStep::WaitEngine => {
                    if master.engine_state.is_none() {
                        continue;
                    }

                    tracing::info!(tick_index = master.tick_index, "EngineState received");

                    step = ReplayStep::WaitExecution;
                }

                ReplayStep::WaitExecution => {
                    if master.execution_state.is_none() {
                        continue;
                    }

                    tracing::info!(tick_index = master.tick_index, "ExecutionState received");

                    //
                    // TODO:
                    // Persistir snapshot global.
                    //

                    master.engine_state = None;
                    master.execution_state = None;
                    master.tick_index += 1;

                    let finished = master.current_tick().is_none();

                    drop(master);

                    state.engine_ack_notify.notify_one();
                    state.execution_ack_notify.notify_one();

                    if finished {
                        let mut master = state.master.write().await;
                        master.replay_status = ReplayStatus::Stopped;
                    } else {
                        step = ReplayStep::PublishTick;

                        // Despertar inmediatamente para publicar el siguiente tick.
                        state.replay_notify.notify_one();
                    }
                }
            }
        }
    });
}
