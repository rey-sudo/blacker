use crate::common::SlaveId;
use crate::master::state::{AppState, MasterState};
use std::time::Duration;
use tokio::sync::RwLockWriteGuard;
use tokio::time;
use tracing::info;

/// Starts a background task that periodically monitors the connection status
/// of all registered slaves.
pub fn run(state: AppState) {
    tokio::spawn(async move {
        let mut interval: time::Interval = time::interval(Duration::from_secs(1));

        info!("Starting slave monitor...");

        loop {
            interval.tick().await;

            let mut changed: bool = false;
            let mut disconnected: Vec<SlaveId> = Vec::new();

            {
                let mut master: RwLockWriteGuard<'_, MasterState> = state.master.write().await;

                // Marks a slave as disconnected if it has not been seen for at least five seconds.
                for slave in master.slaves.values_mut() {
                    if slave.connected && slave.last_seen.elapsed() >= Duration::from_secs(5) {
                        slave.connected = false;
                        changed = true;
                        disconnected.push(slave.id);
                    }
                }
            } 

            if changed {
                let _ = state.publish_master_state().await;

                for id in disconnected {
                    info!(?id, "Slave disconnected by timeout");
                }
            }
        }
    });
}