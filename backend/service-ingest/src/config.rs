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

        Ok(Self {
            client_id,
            symbols,
            pulsar_url,
            total_shards,
            shard_ids,
        })
    }
}
