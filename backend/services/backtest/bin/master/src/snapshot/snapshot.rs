use crate::{
    master::state::MasterState,
    slaves::{engine::EngineState, execution::ExecutionState},
    tasks::ReplayStep,
};
use anyhow::{Context, Result, bail};
use crc32fast::Hasher;
use serde::{Deserialize, Serialize};
use std::path::Path;
use tokio::fs;
use tokio::io::AsyncWriteExt;
use tracing::debug;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReplaySnapshot {
    pub config_hash: String,
    pub tick_index: usize,
    pub replay_step: ReplayStep,
    pub engine_state: EngineState,
    pub execution_state: ExecutionState,
}

const SNAPSHOT_PATH: &str = "./data/replay.bin";

const MAGIC: &[u8; 4] = b"RPLY";
const VERSION: u32 = 1;

#[derive(Debug)]
struct Header {
    version: u32,
    length: u64,
    crc32: u32,
}

pub async fn save_snapshot(master: &MasterState) -> Result<()> {
    if let Some(parent) = Path::new(SNAPSHOT_PATH).parent() {
        fs::create_dir_all(parent).await?;
    }

    let snapshot: ReplaySnapshot = ReplaySnapshot {
        config_hash: master.config_hash.clone(),
        tick_index: master.tick_index,
        replay_step: master.replay_step,
        engine_state: master.engine_state.clone(),
        execution_state: master.execution_state.clone(),
    };

    let payload: Vec<u8> = rmp_serde::to_vec(&snapshot)?;

    let mut hasher = Hasher::new();
    hasher.update(&payload);
    let crc32 = hasher.finalize();

    let header = Header {
        version: VERSION,
        length: payload.len() as u64,
        crc32,
    };

    let mut bytes = Vec::with_capacity(20 + payload.len());

    bytes.extend_from_slice(MAGIC);
    bytes.extend_from_slice(&header.version.to_le_bytes());
    bytes.extend_from_slice(&header.length.to_le_bytes());
    bytes.extend_from_slice(&header.crc32.to_le_bytes());
    bytes.extend_from_slice(&payload);

    let tmp = format!("{SNAPSHOT_PATH}.tmp");

    // Escribir el archivo temporal
    let mut file = fs::File::create(&tmp).await?;
    file.write_all(&bytes).await?;

    // Fuerza a que el sistema operativo sincronice los datos al almacenamiento.
    file.sync_all().await?;

    // Cierra el descriptor antes del rename (especialmente importante en Windows).
    drop(file);

    // Reemplazo atómico del snapshot anterior.
    fs::rename(&tmp, SNAPSHOT_PATH).await?;

    debug!(
        "Snapshot saved (tick={}, {} bytes)",
        snapshot.tick_index,
        bytes.len()
    );

    Ok(())
}

pub async fn load_snapshot() -> Result<Option<ReplaySnapshot>> {
    let bytes = match fs::read(SNAPSHOT_PATH).await {
        Ok(bytes) => bytes,

        Err(err) if err.kind() == std::io::ErrorKind::NotFound => {
            return Ok(None);
        }

        Err(err) => return Err(err.into()),
    };

    if bytes.len() < 20 {
        bail!("Snapshot file is too small");
    }

    if &bytes[..4] != MAGIC {
        bail!("Invalid snapshot magic");
    }

    let version = u32::from_le_bytes(bytes[4..8].try_into()?);

    if version != VERSION {
        bail!(
            "Unsupported snapshot version (expected {}, got {})",
            VERSION,
            version
        );
    }

    let length = u64::from_le_bytes(bytes[8..16].try_into()?);

    let crc32 = u32::from_le_bytes(bytes[16..20].try_into()?);

    let payload = &bytes[20..];

    if payload.len() as u64 != length {
        bail!("Snapshot length mismatch");
    }

    let mut hasher = Hasher::new();
    hasher.update(payload);

    let calculated_crc = hasher.finalize();

    if calculated_crc != crc32 {
        bail!("Snapshot CRC mismatch (file is corrupted)");
    }

    let snapshot: ReplaySnapshot = rmp_serde::from_slice(payload)
    .context("Unable to decode snapshot")?;

    debug!(
        "Snapshot loaded (tick={}, {} bytes)",
        snapshot.tick_index,
        bytes.len()
    );

    Ok(Some(snapshot))
}
