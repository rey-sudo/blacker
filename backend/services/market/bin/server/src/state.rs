use std::sync::Arc;
use clickhouse::Client;
use pulsar::{Pulsar, TokioExecutor};

#[derive(Clone)]
pub struct AppState {
    pub db: Client,
    pub pulsar: Arc<Pulsar<TokioExecutor>>,
}

impl AppState {
    pub fn new(db: Client, pulsar: Arc<Pulsar<TokioExecutor>>) -> Self {
        Self { db, pulsar }
    }
}
