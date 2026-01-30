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

use pulsar::{Pulsar, TokioExecutor};
use service_feed::{
    application::{
        consumers::ohlcv_live_consumer::{ohlcv_live_consumer},
        state::AppState,
        ws::start_ws_server,
    },
    config::Config,
    infrastructure::bootstrap,
};
use std::sync::Arc;
use tokio::signal;

const WS_BUFFER_SIZE: usize = 1024;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    bootstrap::run()?;

    let config: Arc<Config> = Arc::new(Config::from_env()?);

    let state: Arc<AppState> = Arc::new(AppState::new());

    let pulsar: Pulsar<TokioExecutor> = Pulsar::builder(&config.pulsar_url, TokioExecutor)
        .build()
        .await?;

    {
        let c: Arc<Config> = config.clone();
        let s: Arc<AppState> = state.clone();
        let p: Pulsar<TokioExecutor> = pulsar.clone();
        tokio::spawn(async move {
            if let Err(e) = ohlcv_live_consumer(c, s, p).await {
                tracing::error!("ohlcv live consumer crashed: {:?}", e);
            }
        });
    }

    /*
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

    */
    {
        let c: Arc<Config> = config.clone();
        let s: Arc<AppState> = state.clone();
        tokio::spawn(async move {
            start_ws_server(c, s).await;
        });
    }

    signal::ctrl_c().await?;
    tracing::info!("shutdown signal received, exiting");

    Ok(())
}
