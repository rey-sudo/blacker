use anyhow::{Context, Result};
use std::env;

#[derive(Debug, Clone)]
pub struct AppConfig {
    pub symbol: String,
    pub pulsar_url: String,
    pub tick_data_path: String,
}

impl AppConfig {
    pub fn from_env() -> Result<Self> {
        let symbol: String =
            env::var("SYMBOL").context("Missing required environment variable: SYMBOL")?;

        let pulsar_url: String =
            env::var("PULSAR_URL").unwrap_or_else(|_| "pulsar://localhost:6650".to_string());

        let tick_data_path: String = env::var("TICK_DATA_PATH")
            .context("Missing required environment variable: TICK_DATA_PATH")?;

        Ok(Self {
            symbol,
            pulsar_url,
            tick_data_path,
        })
    }
}
