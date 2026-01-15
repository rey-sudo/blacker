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
    /// PostgreSQL url
    pub database_url: String,

    /// Pulsar broker URL
    pub pulsar_url: String,

    /// Topic where Tick events are published
    pub pulsar_topic: String,

    /// Pulsar subscription name (consumer group)
    pub subscription_name: String,

    /// Logical name of this consumer instance
    pub consumer_name: String,

    /// Maximum number of concurrent symbol tasks
    pub max_symbols: usize,

    /// Seconds after which an inactive symbol task is stopped
    pub idle_symbol_ttl_secs: u64,
}

impl Config {
    pub fn from_env() -> anyhow::Result<Self> {
        let database_url: String = std::env::var("DATABASE_URL")
            .map_err(|_| anyhow::anyhow!("DATABASE_URL is not set"))?;

        let pulsar_url: String =
            std::env::var("PULSAR_URL").map_err(|_| anyhow::anyhow!("PULSAR_URL is not set"))?;

        let pulsar_topic: String = std::env::var("PULSAR_TOPIC")
            .map_err(|_| anyhow::anyhow!("PULSAR_TOPIC is not set"))?;

        let subscription_name: String = std::env::var("PULSAR_SUBSCRIPTION")
            .map_err(|_| anyhow::anyhow!("PULSAR_SUBSCRIPTION is not set"))?;

        let consumer_name: String = std::env::var("CONSUMER_NAME")
            .map_err(|_| anyhow::anyhow!("CONSUMER_NAME is not set"))?;

        let max_symbols: usize = std::env::var("MAX_SYMBOLS")
            .map_err(|_| anyhow::anyhow!("MAX_SYMBOLS is not set"))?
            .parse()
            .map_err(|_| anyhow::anyhow!("MAX_SYMBOLS must be a positive integer"))?;

        let idle_symbol_ttl_secs: u64 = std::env::var("IDLE_SYMBOL_TTL_SECS")
            .map_err(|_| anyhow::anyhow!("IDLE_SYMBOL_TTL_SECS is not set"))?
            .parse()
            .map_err(|_| anyhow::anyhow!("IDLE_SYMBOL_TTL_SECS must be a positive integer"))?;

        //=========================================================================================

        if max_symbols == 0 {
            return Err(anyhow::anyhow!("MAX_SYMBOLS must be greater than 0"));
        }

        Ok(Self {
            database_url,
            pulsar_url,
            pulsar_topic,
            subscription_name,
            consumer_name,
            max_symbols,
            idle_symbol_ttl_secs,
        })
    }
}
