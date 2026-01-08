use crate::clients::models::Clients;

#[derive(Debug, Clone)]
pub struct Config {
    pub client_id: Clients,
    pub symbols: Vec<String>,
    pub pulsar_url: String,
}

impl Config {
    pub fn from_env() -> anyhow::Result<Self> {
        let client_id_raw =
            std::env::var("CLIENT_ID").map_err(|_| anyhow::anyhow!("CLIENT_ID is not set"))?;

        let symbols_raw =
            std::env::var("SYMBOLS").map_err(|_| anyhow::anyhow!("SYMBOLS is not set"))?;

        let pulsar_url =
            std::env::var("PULSAR_URL").unwrap_or_else(|_| "pulsar://127.0.0.1:6650".to_string());

        let client_id: Clients = client_id_raw.parse()?;

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
