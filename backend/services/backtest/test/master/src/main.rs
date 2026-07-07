use master::server::start_http_server;
use master::state::AppState;
use master::tasks::{start_master_monitor, start_slave_monitor};
use tickdb::binary::BinaryFile;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    tracing_subscriber::fmt::init();

    let tickdb: BinaryFile = BinaryFile::open("./input/ticks.bin")?;

    tracing::info!(
        trades = tickdb.len(),
        "Tick database loaded"
    );

    let state: AppState = AppState::new();

    start_master_monitor(state.clone());
    start_slave_monitor(state.clone());
    start_http_server(state).await;

    Ok(())
}