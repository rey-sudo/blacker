use crate::state::{AppState, MasterState, ReplayStatus, TickInfo};
use tokio::sync::RwLockReadGuard;
use tokio::sync::RwLockWriteGuard;
use tracing::info;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum ReplayStep {
    PublishTick,
    WaitEngine,
    WaitExecution,
    Persist,
}

pub fn start_replay_task(state: AppState) {
    tokio::spawn(async move {
        loop {
            state.replay_notify.notified().await;

            let mut step: ReplayStep = ReplayStep::PublishTick;

            loop {
                {
                    let master: RwLockReadGuard<'_, MasterState> = state.master.read().await;

                    if master.replay_status != ReplayStatus::Running {
                        info!("Replay stopped.");
                        break;
                    }
                }

                match step {
                    ReplayStep::PublishTick => {
                        let current_tick: Option<TickInfo> = {
                            let master: RwLockReadGuard<'_, MasterState> =
                                state.master.read().await;

                            master.current_tick_info()
                        };

                        let tick_info: TickInfo = match current_tick {
                            Some(tick_info) => tick_info,

                            None => {
                                let mut master: RwLockWriteGuard<'_, MasterState> =
                                    state.master.write().await;
                                    
                                master.replay_status = ReplayStatus::Stopped;

                                info!("Replay finished.");

                                break;
                            }
                        };

                        info!(
                            tick_index = tick_info.tick_index,
                            id = tick_info.tick.id,
                            "Publish Tick"
                        );

                        // publish_tick(&tick).await?;

                        step = ReplayStep::WaitEngine;
                    }
                    ReplayStep::WaitEngine => {
                        state.engine_notify.notified().await;

                        info!("EngineState received.");

                        step = ReplayStep::WaitExecution;
                    }

                    ReplayStep::WaitExecution => {
                        state.execution_notify.notified().await;

                        info!("ExecutionState received.");

                        step = ReplayStep::Persist;
                    }

                    ReplayStep::Persist => {
                        let mut master: RwLockWriteGuard<'_, MasterState> =
                            state.master.write().await;

                        //
                        // TODO:
                        // Persistir snapshot global:
                        //
                        // master.tick_index
                        // master.engine_state
                        // master.execution_state
                        //

                        master.engine_state = None;
                        master.execution_state = None;
                        master.tick_index += 1;

                        drop(master);

                        //
                        // Ahora sí autorizamos el ACK.
                        //
                        state.engine_ack_notify.notify_one();
                        state.execution_ack_notify.notify_one();

                        step = ReplayStep::PublishTick;
                    }
                }
            }
        }
    });
}
