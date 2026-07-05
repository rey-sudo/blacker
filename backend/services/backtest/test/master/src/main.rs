use axum::Router;
use master::{routes, state::AppState};
use std::time::{Duration, SystemTime};
use tokio::time;
use tracing::info;

pub fn start_slave_monitor(state: AppState) {
    tokio::spawn(async move {
        let mut interval: time::Interval = time::interval(Duration::from_secs(10));

        loop {
            interval.tick().await;

            let mut slaves = state.slaves.write().await;

            for slave in slaves.values_mut() {
                if slave.connected && slave.last_seen.elapsed() >= Duration::from_secs(60) {
                    slave.connected = false;
                    info!(?slave, "Slave desconectado por timeout");
                }
            }
        }
    });
}

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt::init();

    let state: master::state::AppState = AppState::new();

    start_slave_monitor(state.clone());

    let app: Router = Router::new().merge(routes::router()).with_state(state);

    let listener: tokio::net::TcpListener =
        tokio::net::TcpListener::bind("0.0.0.0:3000").await.unwrap();

    println!("Master escuchando en :3000");

    axum::serve(listener, app).await.unwrap();
}
