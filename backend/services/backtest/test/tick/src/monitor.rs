use crate::state::{AppState, SlaveState};
use reqwest::Client;
use serde::Serialize;
use std::time::Duration;
use tokio::sync::RwLockReadGuard;
use tokio::time;
use tracing::{error, info};

#[derive(Serialize)]
struct ReportStateRequest {
    id: String,
    status: String,
}

pub fn start_master_report_task(state: AppState) {
    tokio::spawn(async move {
        let client: Client = Client::builder()
            .pool_idle_timeout(Duration::from_secs(300))
            .pool_max_idle_per_host(1)
            .tcp_keepalive(Duration::from_secs(30))
            .build()
            .unwrap();

        let mut interval: time::Interval = time::interval(Duration::from_secs(1));

        loop {
            interval.tick().await;

            let slave: RwLockReadGuard<'_, SlaveState> = state.slave.read().await;

            let body: ReportStateRequest = ReportStateRequest {
                id: format!("{:?}", slave.id),
                status: format!("{:?}", slave.status),
            };

            match client
                .post("http://localhost:3000/report-state")
                .json(&body)
                .send()
                .await
            {
                Ok(response) => {
                    info!("Heartbeat enviado. Status: {}", response.status());
                }
                Err(err) => {
                    error!("No se pudo contactar al master: {}", err);
                }
            }
        }
    });
}
