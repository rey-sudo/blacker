use crate::common::{MasterStatus, SlaveId};
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

            let tick: Option<&ConnectedSlaveState> = master.slaves.get(&SlaveId::Tick);
            let engine: Option<&ConnectedSlaveState> = master.slaves.get(&SlaveId::Engine);

            let tick_connected: bool = tick.is_some_and(|s: &ConnectedSlaveState| s.connected);
            let engine_connected: bool = engine.is_some_and(|s: &ConnectedSlaveState| s.connected);

            let tick_synced: bool = tick
                .is_some_and(|s: &ConnectedSlaveState| s.connected && s.version == master.version);

            let engine_synced: bool = engine
                .is_some_and(|s: &ConnectedSlaveState| s.connected && s.version == master.version);

            let all_connected: bool = tick_connected && engine_connected;

            let all_synced: bool = tick_synced && engine_synced;

            if !all_connected {
                if !matches!(master.status, MasterStatus::Pending) {
                    master.status = MasterStatus::Pending;
                    info!(
                        tick_connected = tick_connected,
                        engine_connected = engine_connected,
                        "Master -> Pending"
                    );
                }

                continue;
            }

            if !all_synced {
                if !matches!(master.status, MasterStatus::Unsync) {
                    master.status = MasterStatus::Unsync;

                    info!(
                        master_version = master.version,
                        tick_version = master.slaves.get(&SlaveId::Tick).unwrap().version,
                        engine_version = master.slaves.get(&SlaveId::Engine).unwrap().version,
                        "Master -> Unsync"
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
