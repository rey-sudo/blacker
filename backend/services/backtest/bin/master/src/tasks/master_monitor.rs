use crate::common::SlaveId;
use crate::master::state::{AppState, MasterState, MasterStatus};
use crate::slaves::slave::ConnectedSlaveState;
use std::time::Duration;
use tokio::sync::RwLockWriteGuard;
use tokio::time;
use tracing::info;

/// Starts a background task that continuously monitors the connection state of
/// the required slaves and updates the master's status accordingly.
///
/// The monitor runs once per second and evaluates whether the required slaves
/// are currently connected.
///
/// - If any required slave is disconnected, the master transitions to
///   [`MasterStatus::Pending`] (if it is not already in that state).
/// - If all required slaves are connected, the master transitions to
///   [`MasterStatus::Ready`] (if it is not already in that state).
///
/// Status transitions are logged to avoid unnecessary repeated log entries.
///
/// # Note
///
/// At the moment, readiness is determined only by the Engine slave.
/// Support for the Execution slave is planned (see the `TODO` in the code).
pub fn run(state: AppState) {
    tokio::spawn(async move {
        let mut interval: time::Interval = time::interval(Duration::from_secs(1));

        info!("Starting master monitor...");

        loop {
            interval.tick().await;

            let mut changed: bool = false;

            let mut master: RwLockWriteGuard<'_, MasterState> = state.master.write().await;

            let execution: Option<&ConnectedSlaveState> = master.slaves.get(&SlaveId::Execution);
            let engine: Option<&ConnectedSlaveState> = master.slaves.get(&SlaveId::Engine);

            // Determines whether the slaves are connected.
            let engine_connected: bool = engine.is_some_and(|s: &ConnectedSlaveState| s.connected);
            let execution_connected: bool =
                execution.is_some_and(|s: &ConnectedSlaveState| s.connected);

            // Evaluates whether all required slaves are connected.
            let all_connected: bool = engine_connected; //TODO: add execution

            if !all_connected {
                if !matches!(master.status, MasterStatus::Pending) {
                    master.status = MasterStatus::Pending;
                    changed = true;
                    info!(
                        execution_connected = execution_connected,
                        engine_connected = engine_connected,
                        "Master -> Pending"
                    );
                }
            } else if !matches!(master.status, MasterStatus::Ready) {
                master.status = MasterStatus::Ready;
                changed = true;
                info!("Master -> Ready");
            }

            drop(master);

            if changed {
                let _ = state.publish_master_state().await;
            }
        }
    });
}
