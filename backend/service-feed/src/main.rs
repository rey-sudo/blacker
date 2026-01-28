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

use std::sync::Arc;
use service_feed::{application::state::AppState, config::Config, infrastructure::bootstrap};



const WS_BUFFER_SIZE: usize = 1024;



/// =======================
/// Main
/// =======================

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    bootstrap::run()?;

    let config: Arc<Config> = Arc::new(Config::from_env()?);

    let state: Arc<AppState> = Arc::new(AppState::new());

    // -----------------------
    // Pulsar consumers (always-on)
    // -----------------------

    {
        let s: Arc<AppState> = state.clone();
        tokio::spawn(async move {
            if let Err(e) = consume_ohlcv_live(s).await {
                tracing::error!("ohlcv live consumer crashed: {:?}", e);
            }
        });
    }

    {
        let s: Arc<AppState> = state.clone();
        tokio::spawn(async move {
            if let Err(e) = consume_ohlcv_closed(s).await {
                tracing::error!("ohlcv closed consumer crashed: {:?}", e);
            }
        });
    }

    {
        let s: Arc<AppState> = state.clone();
        tokio::spawn(async move {
            if let Err(e) = consume_indicator_output(s).await {
                tracing::error!("indicator-output consumer crashed: {:?}", e);
            }
        });
    }

    // -----------------------
    // WebSocket server
    // -----------------------

    {
        let s: Arc<AppState> = state.clone();
        tokio::spawn(async move {
            start_ws_server(s).await;
        });
    }

    // -----------------------
    // Graceful shutdown
    // -----------------------

    signal::ctrl_c().await?;
    tracing::info!("shutdown signal received, exiting");

    Ok(())
}
