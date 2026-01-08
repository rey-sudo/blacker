use serde::{Deserialize, Serialize};
use std::str::FromStr;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum Clients {
    Binance,
    Databento
}


impl FromStr for Clients {
    type Err = anyhow::Error;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s {
            "binance" => Ok(Clients::Binance),
            "databento" => Ok(Clients::Databento),
            other => Err(anyhow::anyhow!(
                "Unknown CLIENT_ID '{}'. Supported: binance, databento",
                other
            )),
        }
    }
}