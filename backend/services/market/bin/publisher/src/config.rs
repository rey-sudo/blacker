use anyhow::{Context, Result};
use std::env;

#[derive(Debug, Clone)]
pub struct Config {
    pub publisher_id: String,
    pub source: String,
    pub symbols: String,
    pub batch_size: usize,
    pub poll_interval_ms: u64,
}

impl Config {
    pub fn from_env() -> Result<Self> {
        Ok(Self {
            publisher_id: env::var("PUBLISHER_ID")
                .context("Missing PUBLISHER_ID")?,

            source: env::var("SOURCE")
                .context("Missing SOURCE")?,

            symbols: env::var("SYMBOLS")
                .context("Missing SYMBOLS")?,

            batch_size: env::var("BATCH_SIZE")
                .unwrap_or_else(|_| "10000".to_string())
                .parse()?,

            poll_interval_ms: env::var("POLL_INTERVAL_MS")
                .unwrap_or_else(|_| "100".to_string())
                .parse()?,
        })
    }
}