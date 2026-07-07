use crate::common::MasterStatus;
use crate::slave::ConnectedSlaveState;
use crate::state::{AppState, MasterState};
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

            let all_connected: bool =
                !master.slaves.is_empty() &&
                master.slaves.values().all(|s: &ConnectedSlaveState| s.connected);

            let has_disconnected: bool =
                master.slaves.values().any(|s: &ConnectedSlaveState| !s.connected);

            if all_connected && !matches!(master.status, MasterStatus::Ready) {
                master.status = MasterStatus::Ready;
                info!("Todos los slaves conectados. Master -> Ready");
            }

            if has_disconnected && !matches!(master.status, MasterStatus::Pending) {
                master.status = MasterStatus::Pending;
                info!("Hay slaves desconectados. Master -> Pending");
            }
        }
    });
}