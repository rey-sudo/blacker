use anyhow::{Context, Result};
use std::env;

#[derive(Debug, Clone)]
pub struct AppConfig {
    pub symbol: String,
}

impl AppConfig {
    pub fn from_env() -> Result<Self> {
        let symbol: String = env::var("SYMBOL")
            .context("Missing required environment variable: SYMBOL")?;

        Ok(Self { symbol })
    }
}