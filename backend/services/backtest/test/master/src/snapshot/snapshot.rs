use crate::{slave::ExecutionState, slaves::engine::EngineState, state::MasterState};
use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::path::Path;
use tokio::fs;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReplaySnapshot {
    pub tick_index: usize,
    pub engine_state: Option<EngineState>,
    pub execution_state: Option<ExecutionState>,
}

const SNAPSHOT_PATH: &str = "./data/replay.json";

pub async fn save_snapshot(master: &MasterState) -> Result<()> {
    if let Some(parent) = Path::new(SNAPSHOT_PATH).parent() {
        fs::create_dir_all(parent).await?;
    }

    let snapshot: ReplaySnapshot = ReplaySnapshot {
        tick_index: master.tick_index,
        engine_state: master.engine_state.clone(),
        execution_state: master.execution_state.clone(),
    };

    let json: Vec<u8> = serde_json::to_vec_pretty(&snapshot)?;

    fs::write(SNAPSHOT_PATH, json).await?;

    Ok(())
}

pub async fn load_snapshot() -> Result<Option<ReplaySnapshot>> {
    match fs::read(SNAPSHOT_PATH).await {
        Ok(bytes) => Ok(Some(serde_json::from_slice(&bytes)?)),

        Err(error) if error.kind() == std::io::ErrorKind::NotFound => {
            Ok(None)
        }

        Err(error) => Err(error.into()),
    }
}