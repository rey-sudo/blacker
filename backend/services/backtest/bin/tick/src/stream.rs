use crate::model::Trade;
use anyhow::{Context, Result};
use futures::future::join_all;
use pulsar::{Producer, ProducerOptions, Pulsar, TokioExecutor};
use std::{
    fs::File,
    io::{BufReader, Read},
    time::Duration,
};
use tokio_util::sync::CancellationToken;
use tracing::info;

const MAX_IN_FLIGHT: usize = 5000;
const LOG_INTERVAL: usize = 100_000;

pub async fn start_tick_streaming(
    payload: String,
    token: CancellationToken,
    pulsar_clone: Pulsar<TokioExecutor>,
) -> Result<()> {
    info!("Starting streaming: {}", payload);

    let mut pulsar_producer = pulsar_clone
        .producer()
        .with_topic("persistent://public/default/ticks")
        .with_options(ProducerOptions {
            batch_size: Some(1000),
            batch_timeout: Some(Duration::from_millis(5)),
            block_queue_if_full: true,
            ..Default::default()
        })
        .build()
        .await
        .context("Failed to build Pulsar producer")?;

    let bin_path: &str = "./output/ticks.bin";

    stream_ticks(bin_path, &mut pulsar_producer, token.clone()).await?;

    info!("Backtest finished");

    Ok(())
}

pub async fn stream_ticks(
    bin_path: &str,
    pulsar_producer: &mut Producer<TokioExecutor>,
    token: CancellationToken,
) -> Result<()> {
    let file = File::open(bin_path)?;
    let mut reader = BufReader::new(file);

    let mut buffer = [0u8; std::mem::size_of::<Trade>()];

    let mut count: usize = 0;

    info!("Starting tick streaming");

    let mut pending = Vec::with_capacity(MAX_IN_FLIGHT);

    loop {
        if token.is_cancelled() {
            info!("Streaming cancelled");
            break;
        }

        match reader.read_exact(&mut buffer) {
            Ok(_) => {}
            Err(e) if e.kind() == std::io::ErrorKind::UnexpectedEof => break,
            Err(e) => return Err(e.into()),
        }

        let trade = *bytemuck::from_bytes::<Trade>(&buffer);

        let receipt = pulsar_producer.send_non_blocking(trade).await?;

        pending.push(receipt);

        count += 1;

        if pending.len() >= MAX_IN_FLIGHT {
            let receipts = std::mem::replace(&mut pending, Vec::with_capacity(MAX_IN_FLIGHT));

            for result in join_all(receipts).await {
                result?;
            }

            if count % LOG_INTERVAL == 0 {
                info!("{count} ticks enviados");
            }
        }
    }

    if !pending.is_empty() {
        for result in join_all(pending).await {
            result?;
        }
    }

    info!("Streaming finished. Total ticks: {count}");

    Ok(())
}
