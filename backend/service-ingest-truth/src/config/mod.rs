/*
 * BLACKER
 * Copyright (C) 2026  Juan José Caballero Rey
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

/// Microservice configuration struct
/// ```
/// let config: Config = Config::from_env()?;
/// ```
#[derive(Debug, Clone)]
pub struct Config {
    pub consumer_name: String,
    pub database_url: String,
    pub pulsar_url: String,

    pub total_shards: u32,
    pub shard_ids: Vec<u32>,

    pub max_symbols: usize,
}

impl Config {
    pub fn from_env() -> anyhow::Result<Self> {
        let consumer_name: String = std::env::var("POD_NAME")
            .unwrap_or_else(|_| format!("service-ingest-truth-{}", std::process::id()));

        let pulsar_url: String =
            std::env::var("PULSAR_URL").map_err(|_| anyhow::anyhow!("PULSAR_URL is not set"))?;

        let database_url: String = std::env::var("DATABASE_URL")
            .map_err(|_| anyhow::anyhow!("DATABASE_URL is not set"))?;

        let total_shards_raw: String = std::env::var("TOTAL_SHARDS")
            .map_err(|_| anyhow::anyhow!("TOTAL_SHARDS is not set"))?;

        let shard_ids_raw: String =
            std::env::var("SHARD_IDS").map_err(|_| anyhow::anyhow!("SHARD_IDS is not set"))?;

        let max_symbols_raw: String =
            std::env::var("MAX_SYMBOLS").map_err(|_| anyhow::anyhow!("MAX_SYMBOLS is not set"))?;

        //==========================================================================================

        // Parses the TOTAL_SHARDS environment variable.
        // This value defines the total number of logical shards used for deterministic symbol distribution.
        // It must be a positive integer and must be consistent across all service-ingest replicas.
        // An invalid or missing value is treated as a fatal configuration error.
        let total_shards: u32 = total_shards_raw
            .parse()
            .map_err(|_| anyhow::anyhow!("TOTAL_SHARDS must be a positive integer"))?;

        if total_shards == 0 {
            return Err(anyhow::anyhow!("TOTAL_SHARDS must be > 0"));
        }

        // Parses the SHARD_IDS environment variable.
        // SHARD_IDS defines the logical shard identifiers owned by this pod.
        // Multiple shard IDs can be assigned using a comma-separated list (e.g. "0,1,2").
        // Each shard ID must be a valid non-negative integer and must be within the range
        // [0, TOTAL_SHARDS - 1].
        // An invalid format or non-integer value is treated as a fatal configuration error.
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

        let max_symbols: usize = max_symbols_raw
            .parse()
            .map_err(|_| anyhow::anyhow!("MAX_SYMBOLS must be a positive integer"))?;

        if max_symbols == 0 {
            return Err(anyhow::anyhow!("MAX_SYMBOLS must be > 0"));
        }

        Ok(Self {
            consumer_name,
            database_url,
            pulsar_url,
            total_shards,
            shard_ids,
            max_symbols,
        })
    }
}
