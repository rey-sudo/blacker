use master::server::start_http_server;
use master::state::AppState;
use master::tasks::{ReplayEvent, start_master_monitor, start_replay_task, start_slave_monitor};
use std::sync::Arc;
use tickdb::binary::BinaryFile;
use tokio::sync::mpsc;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    tracing_subscriber::fmt::init();

    let tick_data: Arc<BinaryFile> = Arc::new(BinaryFile::open("./input/ticks.bin")?);

    let state: AppState = AppState::new(tick_data);

    let (replay_tx, replay_rx) = mpsc::channel::<ReplayEvent>(1024);

    start_master_monitor(state.clone());
    start_slave_monitor(state.clone());

    start_replay_task(state.clone(), replay_rx);

    // start_engine_state_consumer(..., replay_tx.clone());
    // start_execution_state_consumer(..., replay_tx);

    start_http_server(state).await;

    Ok(())
}
