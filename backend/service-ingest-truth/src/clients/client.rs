use anyhow::Result;
use async_trait::async_trait;
use serde::{Deserialize, Serialize};
use std::str::FromStr;

use crate::clients::binance::Binance;
use crate::config::Config;
use crate::common::candle::Candle;

/// Data provider Client enum
/// ```
/// Client::Binance
/// Client::Databento
/// ```
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum Client {
    Binance,
    Databento,
}

impl FromStr for Client {
    type Err = anyhow::Error;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s {
            "binance" => Ok(Client::Binance),
            "databento" => Ok(Client::Databento),
            other => Err(anyhow::anyhow!(
                "Unknown CLIENT_ID '{}'. Supported: binance, databento",
                other
            )),
        }
    }
}

/// Trait that all data provider clients must implement
#[async_trait]
pub trait AnyClient: Send + Sync {
    async fn fetch_ohlcv_1m(
        &self,
        symbol: &str,
        start_time: Option<i64>,
        end_time: Option<i64>,
        limit: u16,
    ) -> Result<Vec<Candle>>;
}

/// Factory function to create the appropriate client based on config
pub fn create_client(config: &Config) -> Result<Box<dyn AnyClient>> {
    match &config.client_id {
        Client::Binance => {
            let client: Binance = Binance::new();
            Ok(Box::new(client))
        }
        Client::Databento => {
            // TODO: Implement Databento client later
            Err(anyhow::anyhow!("Databento client not implemented yet"))
        }
    }
}
