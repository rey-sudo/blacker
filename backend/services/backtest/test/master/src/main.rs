use axum::Router;
use master::monitor::{start_master_monitor, start_slave_monitor};
use master::{routes, state::AppState};

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt::init();

    let state: master::state::AppState = AppState::new();

    start_master_monitor(state.clone());
    start_slave_monitor(state.clone());

    let app: Router = Router::new().merge(routes::router()).with_state(state);

    let listener: tokio::net::TcpListener =
        tokio::net::TcpListener::bind("0.0.0.0:3000").await.unwrap();

    println!("Master escuchando en :3000");

    axum::serve(listener, app).await.unwrap();
}
