
#[derive(Debug, Clone)]
pub struct Config {
    pub client_id: String,
    pub symbols: Vec<String>,
}

impl Config {
    pub fn from_env() -> anyhow::Result<Self> {
        let client_id = std::env::var("CLIENT_ID")
            .map_err(|_| anyhow::anyhow!("CLIENT_ID is not set"))?;

        let symbols_raw = std::env::var("SYMBOLS")
            .map_err(|_| anyhow::anyhow!("SYMBOLS is not set"))?;

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
        })
    }
}
