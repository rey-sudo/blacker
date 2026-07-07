use crate::state::{AppState, MasterState};
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
                    info!(?slave.id, "Slave disconnected by timeout");
                }
            }
        }
    });
}