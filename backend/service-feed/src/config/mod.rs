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

use serde::Deserialize;
use validator::Validate;

/// Microservice configuration struct
/// ```
/// let config: Config = Config::from_env()?;
/// ```
#[derive(Debug, Clone, Deserialize, Validate)]
pub struct Config {
    #[validate(length(min = 1, message = "DATABASE_URL must not be empty"))]
    pub database_url: String,

    #[validate(range(min = 1024, max = 65535, message = "PORT must be between 1024 and 65535"))]
    pub port: u16,
}

impl Config {
    pub fn from_env() -> anyhow::Result<Self> {
       
        let database_url: String = std::env::var("DATABASE_URL")
            .map_err(|_| anyhow::anyhow!("DATABASE_URL is not set"))?;

      
        let port_str: String = std::env::var("PORT")
            .map_err(|_| anyhow::anyhow!("PORT is not set"))?;

        let port: u16 = port_str.parse()
            .map_err(|_| anyhow::anyhow!("PORT must be a valid number"))?;

        let config: Config = Config { database_url, port };

        config.validate()
            .map_err(|e: validator::ValidationErrors| anyhow::anyhow!("Invalid config: {}", e))?;

        Ok(config)
    }
}