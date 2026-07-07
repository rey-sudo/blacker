use crate::common::MasterStatus;
use crate::state::{AppState, SlaveState};
use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::time::Duration;
use tokio::sync::RwLockWriteGuard;
use tokio::time;
use tracing::{error, info};

#[derive(Serialize)]
struct ReportStateBody {
    id: String,
    status: String,
    version: u64,
}

#[derive(Debug, Deserialize)]
struct ReportResponse {
    ok: bool,
    master: MasterStatus,
    version: u64,
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

            let mut slave: RwLockWriteGuard<'_, SlaveState> = state.slave.write().await;

            let body: ReportStateBody = ReportStateBody {
                id: format!("{:?}", slave.id),
                status: format!("{:?}", slave.status),
                version: slave.version,
            };

            match client
                .post("http://localhost:3000/master/report-state")
                .json(&body)
                .send()
                .await
            {
                Ok(response) => {
                    let report: ReportResponse = response.json().await.unwrap();

                    info!(?report);

                    slave.version = report.version
                }
                Err(err) => {
                    error!("No se pudo contactar al master: {}", err);
                }
            }
        }
    });
}
