use tick::server::start_http_server;
use tick::state::AppState;
use tick::tasks::start_master_report_task;

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt::init();

    let state: tick::state::AppState = AppState::new();

    start_master_report_task(state.clone());

    start_http_server(state).await;
}
