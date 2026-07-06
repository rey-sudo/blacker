use crate::slave::SlaveState;
use crate::state::{AppState, MasterState, MasterStatus};
use std::time::Duration;
use tokio::sync::RwLockWriteGuard;
use tokio::time;
use tracing::info;

pub fn start_slave_monitor(state: AppState) {
    tokio::spawn(async move {
        let mut interval: time::Interval = time::interval(Duration::from_secs(1));

        loop {
            interval.tick().await;

            let mut master: RwLockWriteGuard<'_, MasterState> = state.master.write().await;

            for slave in master.slaves.values_mut() {
                if slave.connected && slave.last_seen.elapsed() >= Duration::from_secs(3) {
                    slave.connected = false;
                    info!(?slave, "Slave desconectado por timeout");
                }
            }
        }
    });
}

pub fn start_master_monitor(state: AppState) {
    tokio::spawn(async move {
        let mut interval: time::Interval = time::interval(Duration::from_secs(1));

        loop {
            interval.tick().await;

            let mut master: RwLockWriteGuard<'_, MasterState> = state.master.write().await;

            let all_connected: bool =
                !master.slaves.is_empty() &&
                master.slaves.values().all(|s: &SlaveState| s.connected);

            let has_disconnected: bool =
                master.slaves.values().any(|s: &SlaveState| !s.connected);

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