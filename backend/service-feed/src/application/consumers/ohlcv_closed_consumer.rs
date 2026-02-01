use crate::{
    application::{state::AppState, types::Symbol},
    common::candle::{Candle, Timeframe},
    config::Config,
};
use anyhow::Result;
use futures_util::TryStreamExt;
use pulsar::{Consumer, Pulsar, SubType};
use std::{str::FromStr, sync::Arc};
use tracing::{error, info};

pub async fn listen(
    config: Arc<Config>,
    state: Arc<AppState>,
    pulsar: Pulsar<pulsar::TokioExecutor>,
) -> Result<()> {
    let subscription_name: String = format!("{}_ohlcv-timeframe-closed", &config.pod_name);

    info!(subscription_name = %subscription_name, "Starting OHLCV consumer");

    // all allowed timeframes
    let mut consumer: Consumer<Candle, _> = pulsar
        .consumer()
        .with_subscription_type(SubType::Exclusive)
        .with_subscription(subscription_name)
        .with_topics([
            "non-persistent://public/market-data/ohlcv-1m-closed",
            "non-persistent://public/market-data/ohlcv-5m-closed",
        ])
        .build()
        .await?;

    while let Some(msg) = consumer.try_next().await? {
        let candle: Candle = match msg.deserialize() {
            Ok(c) => c,
            Err(e) => {
                error!("ohlcv-live deserialize error: {}", e);
                consumer.ack(&msg).await?;
                continue;
            }
        };

        #[cfg(debug_assertions)]
        info!(
            symbol = %candle.symbol,
            open_time = candle.open_time,
            close_time = candle.close_time,
            "ohlcv closed"
        );

        let timeframe: Timeframe = match Timeframe::from_str(&candle.timeframe) {
            Ok(tf) => tf,
            Err(_) => {
                error!(
                    symbol = %candle.symbol,
                    timeframe = %candle.timeframe,
                    "invalid timeframe"
                );
                consumer.ack(&msg).await?;
                continue;
            }
        };

        let key: (Symbol, Timeframe) = (candle.symbol.clone(), timeframe);

        // 1️⃣ construir payload UNA SOLA VEZ
        let payload: Arc<serde_json::Value> = Arc::new(serde_json::json!({
            "type": "ohlcv",
            "symbol": candle.symbol,
            "timeframe": candle.timeframe,
            "open_time": candle.open_time,
            "close_time": candle.close_time,
            "open": candle.open,
            "high": candle.high,
            "low": candle.low,
            "close": candle.close,
            "volume": candle.volume,
            "is_live": false,
        }));

        // 2️⃣ fan-out por charts
        if let Some(context_ids) = state.ohlcv_index.get(&key) {
            for context_id in context_ids.iter() {
                if let Some(chart) = state.charts.get(context_id) {
                    // no await, no bloqueo del consumer
                    if chart.ws_sender.try_send(Arc::clone(&payload)).is_err() {
                        // canal cerrado o backpressure → cleanup posterior
                        tracing::debug!(
                            context_id = %context_id,
                            "ws channel closed while routing ohlcv"
                        );
                    }
                }
            }
        }

        consumer.ack(&msg).await?;
    }

    Err(anyhow::anyhow!("ohlcv-closed consumer exited unexpectedly"))
}
