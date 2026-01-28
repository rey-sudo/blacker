use std::sync::Arc;

use anyhow::Result;
use futures_util::StreamExt;
use pulsar::{Consumer, Pulsar, SubType};
use tracing::{error, info};

use crate::{
    application::{state::AppState},
    common::candle::Candle,
};

pub async fn ohlcv_live_consumer(
    state: Arc<AppState>,
    pulsar: Pulsar<pulsar::TokioExecutor>,
) -> Result<()> {
    info!("starting ohlcv-live consumer");

    // Regex subscription: ohlcv-{timeframe}-live
    let mut consumer: Consumer<Vec<u8>, _> = pulsar
        .consumer()
        .with_subscription_type(SubType::Shared)
        .with_subscription("service-feed")
        .with_topics(["non-persistent://public/market-data/ohlcv-1m-live"])
        .build()
        .await?;

    // Always-on loop
    while let Some(msg) = consumer.next().await {
        match msg {
            Ok(msg) => {
                let payload: &Vec<u8> = &msg.payload.data;

                let candle: Candle = match serde_json::from_slice(payload) {
                    Ok(c) => c,
                    Err(e) => {
                        error!("ohlcv-live parse error: {}", e);
                        consumer.ack(&msg).await?;
                        continue;
                    }
                };

                info!(?candle, "received ohlcv live candle");

                /*
                               let key = (candle.symbol.clone(), candle.timeframe.clone());
                               let arc = Arc::new(candle);

                               // 2) Lookup subscribers
                               if let Some(subs) = state.ohlcv_subs.get(&key) {
                                   for tx in subs.iter() {
                                       // 3) Backpressure-safe send
                                       if tx.try_send(Arc::clone(&arc)).is_err() {
                                           // WS is slow → drop live update
                                       }
                                   }
                               }
                */
                // 4) Ack Pulsar message
                consumer.ack(&msg).await?;
            }

            Err(e) => {
                error!("pulsar ohlcv-live consumer error: {}", e);
            }
        }
    }

    Err(anyhow::anyhow!("ohlcv-live consumer exited unexpectedly"))
}
