use crate::clients::client::Client;

/// Microservice configuration struct
/// ```
/// let config: Config = Config::from_env()?;
/// ```
#[derive(Debug, Clone)]
pub struct Config {
    pub client_id: Client,
    pub symbols: Vec<String>,
    pub pulsar_url: String,
}

impl Config {
    pub fn from_env() -> anyhow::Result<Self> {
        let client_id_raw: String =
            std::env::var("CLIENT_ID").map_err(|_| anyhow::anyhow!("CLIENT_ID is not set"))?;

        let symbols_raw: String =
            std::env::var("SYMBOLS").map_err(|_| anyhow::anyhow!("SYMBOLS is not set"))?;

        let pulsar_url: String =
            std::env::var("PULSAR_URL").map_err(|_| anyhow::anyhow!("PULSAR_URL is not set"))?;

        //-----------------------------------------------------------------------------------------

        let client_id: Client = client_id_raw.parse()?;

        let symbols: Vec<String> = symbols_raw
            .split(',')
            .map(|s| s.trim().to_uppercase())
            .filter(|s| !s.is_empty())
            .collect();

        if symbols.is_empty() {
            return Err(anyhow::anyhow!("SYMBOLS cannot be empty"));
        }

        Ok(Self {
            client_id,
            symbols,
            pulsar_url,
        })
    }
}
