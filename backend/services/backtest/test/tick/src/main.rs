use tick::monitor::{start_master_report_task};
use tick::server::start_http_server;
use tick::state::AppState;

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt::init();

    let state: tick::state::AppState = AppState::new();

    start_master_report_task();

    start_http_server(state).await;
}
