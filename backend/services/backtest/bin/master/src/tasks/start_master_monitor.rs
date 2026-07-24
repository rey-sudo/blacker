use crate::common::SlaveId;
use crate::slaves::slave::ConnectedSlaveState;
use crate::master::state::{AppState, MasterState, MasterStatus};
use std::time::Duration;
use tokio::sync::RwLockWriteGuard;
use tokio::time;
use tracing::info;

pub fn start_master_monitor(state: AppState) {
    tokio::spawn(async move {
        let mut interval: time::Interval = time::interval(Duration::from_secs(1));

        loop {
            interval.tick().await;

            let mut master: RwLockWriteGuard<'_, MasterState> = state.master.write().await;

            let execution: Option<&ConnectedSlaveState> = master.slaves.get(&SlaveId::Execution);
            let engine: Option<&ConnectedSlaveState> = master.slaves.get(&SlaveId::Engine);

            let execution_connected: bool =
                execution.is_some_and(|s: &ConnectedSlaveState| s.connected);
            let engine_connected: bool = engine.is_some_and(|s: &ConnectedSlaveState| s.connected);

            let all_connected: bool = execution_connected && engine_connected;

            if !all_connected {
                if !matches!(master.status, MasterStatus::Pending) {
                    master.status = MasterStatus::Pending;
                    info!(
                        execution_connected = execution_connected,
                        engine_connected = engine_connected,
                        "Master -> Pending"
                    );
                }

                continue;
            }

            if !matches!(master.status, MasterStatus::Ready) {
                master.status = MasterStatus::Ready;
                info!("Master -> Ready");
            }
        }
    });
}
