use master::server::start_http_server;
use master::state::AppState;
use master::tasks::{start_master_monitor, start_slave_monitor};
use std::sync::Arc;
use tickdb::binary::BinaryFile;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    tracing_subscriber::fmt::init();

    let tick_data: Arc<BinaryFile> = Arc::new(BinaryFile::open("./input/ticks.bin")?);

    let state: AppState = AppState::new(tick_data);

    start_master_monitor(state.clone());
    //start_slave_monitor(state.clone());
    start_http_server(state).await;

    Ok(())
}
