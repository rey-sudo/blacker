use master::server::start_http_server;
use master::state::AppState;
use master::tasks::{start_master_monitor, start_slave_monitor};
use tickdb::binary::BinaryFile;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    tracing_subscriber::fmt::init();

    let db: BinaryFile = BinaryFile::open("./input/ticks.bin")?;

    let mut cursor = db.cursor();

    println!("{:?}", cursor.current());

    let state: AppState = AppState::new();

    start_master_monitor(state.clone());
    start_slave_monitor(state.clone());
    start_http_server(state).await;

    Ok(())
}
