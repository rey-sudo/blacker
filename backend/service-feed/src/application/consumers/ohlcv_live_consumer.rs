use crate::{application::state::AppState, common::candle::Candle, config::Config};
use anyhow::Result;
use futures_util::TryStreamExt;
use pulsar::{Consumer, Pulsar, SubType};
use std::sync::Arc;
use tracing::{error, info};

pub async fn ohlcv_live_consumer(
    config: Arc<Config>,
    state: Arc<AppState>,
    pulsar: Pulsar<pulsar::TokioExecutor>,
) -> Result<()> {

    let subscription_name: String = format!("{}_ohlcv-timeframe-live", &config.pod_name);

    info!(subscription_name = %subscription_name, "Starting OHLCV consumer");

    let mut consumer: Consumer<Candle, _> = pulsar
        .consumer()
        .with_subscription_type(SubType::Exclusive)
        .with_subscription(subscription_name)
        .with_topics(["non-persistent://public/market-data/ohlcv-1m-live"])
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
            "ohlcv live"
        );

        consumer.ack(&msg).await?;
    }

    Err(anyhow::anyhow!("ohlcv-live consumer exited unexpectedly"))
}
