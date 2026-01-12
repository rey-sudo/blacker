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

    pub total_shards: u32,
    pub shard_ids: Vec<u32>,
}

impl Config {
    pub fn from_env() -> anyhow::Result<Self> {
        let client_id_raw: String =
            std::env::var("CLIENT_ID").map_err(|_| anyhow::anyhow!("CLIENT_ID is not set"))?;

        let symbols_raw: String =
            std::env::var("SYMBOLS").map_err(|_| anyhow::anyhow!("SYMBOLS is not set"))?;

        let pulsar_url: String =
            std::env::var("PULSAR_URL").map_err(|_| anyhow::anyhow!("PULSAR_URL is not set"))?;

        let total_shards_raw: String = std::env::var("TOTAL_SHARDS")
            .map_err(|_| anyhow::anyhow!("TOTAL_SHARDS is not set"))?;

        let shard_ids_raw: String =
            std::env::var("SHARD_IDS").map_err(|_| anyhow::anyhow!("SHARD_IDS is not set"))?;

        //=========================================================================================

        let client_id: Client = client_id_raw.parse()?;

        let symbols: Vec<String> = symbols_raw
            .split(',')
            .map(|s| s.trim().to_uppercase())
            .filter(|s| !s.is_empty())
            .collect();

        if symbols.is_empty() {
            return Err(anyhow::anyhow!("SYMBOLS cannot be empty"));
        }

        let total_shards: u32 = total_shards_raw
            .parse()
            .map_err(|_| anyhow::anyhow!("TOTAL_SHARDS must be a positive integer"))?;

        if total_shards == 0 {
            return Err(anyhow::anyhow!("TOTAL_SHARDS must be > 0"));
        }

        let shard_ids: Vec<u32> = shard_ids_raw
            .split(',')
            .map(|s| s.trim().parse::<u32>())
            .collect::<Result<Vec<_>, _>>()
            .map_err(|_| anyhow::anyhow!("Invalid SHARD_IDS format"))?;

        if shard_ids.is_empty() {
            return Err(anyhow::anyhow!("SHARD_IDS cannot be empty"));
        }

        for &sid in &shard_ids {
            if sid >= total_shards {
                return Err(anyhow::anyhow!(
                    "SHARD_ID {} out of range (TOTAL_SHARDS={})",
                    sid,
                    total_shards
                ));
            }
        }

        Ok(Self {
            client_id,
            symbols,
            pulsar_url,
            total_shards,
            shard_ids,
        })
    }
}
