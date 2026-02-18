use anyhow::Result;
use dotenvy::from_filename;
use tracing::info;

use crate::config::Config;

pub fn run() -> Result<()> {
    from_filename(".env.local").ok();

    // Initialize tracing subscriber for structured, async-safe logging.
    // Enables info!, warn!, error! logs across the entire service.
    tracing_subscriber::fmt::init();

    info!("Bootstrap finished");

    Ok(())
}

pub fn get_config() -> Result<Config> {
    let config: Config = Config::from_env()?;

    Ok(config)
}