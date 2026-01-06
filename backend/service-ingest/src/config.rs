use std::env;

#[derive(Debug, Clone)]
pub struct Config {
    pub client_id: String,
    pub symbols: Vec<String>,
}

impl Config {
    pub fn from_env() -> Self {
        let client_id = env::var("CLIENT_ID")
            .unwrap_or_else(|_| "binance".to_string());

        let symbols = env::var("SYMBOLS")
            .unwrap_or_else(|_| "BTCUSDT".to_string())
            .split(',')
            .map(|s| s.trim().to_uppercase())
            .collect();

        Self {
            client_id,
            symbols,
        }
    }
}
