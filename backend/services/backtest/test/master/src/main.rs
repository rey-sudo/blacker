use master::server::start_http_server;
use master::state::AppState;
use master::tasks::{start_master_monitor, start_slave_monitor};

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt::init();

    let state: master::state::AppState = AppState::new();

    start_master_monitor(state.clone());
    start_slave_monitor(state.clone());
    start_http_server(state).await;
}
