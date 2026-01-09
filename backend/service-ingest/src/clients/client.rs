use serde::{Deserialize, Serialize};
use std::str::FromStr;

///Data provider Client enum 
/// ```
/// Client::Binance
/// Client::Databento
/// ```
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum Client {
    Binance,
    Databento
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