/*
 * BLACKER
 * Copyright (C) 2024  Juan José Caballero Rey
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

 
mod config;
mod clients;
mod common;

use anyhow::{anyhow, Result};
use config::Config;
use dotenvy::dotenv;
use tokio::task::JoinHandle;
use tracing::info;

#[tokio::main]
async fn main() -> Result<()> {
    dotenv().ok();
    tracing_subscriber::fmt::init();

    let config = Config::from_env();

    info!("Starting ingest service");
    info!("Client: {}", config.client_id);
    info!("Symbols: {:?}", config.symbols);

    let mut handles: Vec<JoinHandle<Result<()>>> = Vec::new();

    match config.client_id.as_str() {
        "binance" => {
            for symbol in &config.symbols {
                let s = symbol.clone();

                handles.push(tokio::spawn(async move {
                    clients::binance::run(&s).await
                }));
            }
        }
        other => {
            return Err(anyhow!(
                "Unknown CLIENT_ID '{}'. Supported: binance",
                other
            ));
        }
    }


    for handle in handles {
        handle.await??;
    }

    Ok(())
}