/*
 * BLACKER
 * Copyright (C) 2025  Juan José Caballero Rey
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

use serde::Deserialize;
use validator::Validate;
/// Microservice configuration struct
/// ```
/// let config: Config = Config::from_env()?;
/// ```
#[derive(Debug, Clone, Deserialize, Validate)]
pub struct Config {
    #[validate(length(min = 1, message = "SERVICE_NAME must not be empty"))]
    pub service_name: String,
    #[validate(length(min = 1, message = "PULSAR_URL must not be empty"))]
    pub pulsar_url: String,
    pub max_workers: usize,
}

impl Config {
    pub fn from_env() -> anyhow::Result<Self> {
        let service_name_raw: String = std::env::var("SERVICE_NAME")
            .map_err(|_| anyhow::anyhow!("SERVICE_NAME is not set"))?;

        let pulsar_url_raw: String =
            std::env::var("PULSAR_URL").map_err(|_| anyhow::anyhow!("PULSAR_URL is not set"))?;

        let max_workers_raw: String =
            std::env::var("MAX_WORKERS").map_err(|_| anyhow::anyhow!("MAX_WORKERS is not set"))?;

        //==========================================================================================

        let max_workers: usize = max_workers_raw
            .parse()
            .map_err(|_| anyhow::anyhow!("MAX_WORKERS must be a positive integer"))?;

        if max_workers == 0 {
            return Err(anyhow::anyhow!("MAX_WORKERS must be > 0"));
        }

        let config: Config = Config {
            service_name: service_name_raw,
            pulsar_url: pulsar_url_raw,
            max_workers,
        };

        config
            .validate()
            .map_err(|e: validator::ValidationErrors| anyhow::anyhow!("Invalid config: {}", e))?;

        Ok(config)
    }
}
