use crate::models::Tick;
use anyhow::Result;
use async_channel::{Receiver, Sender};
use std::process;
use std::time::Duration;
use tokio::time::{Interval, MissedTickBehavior, interval};
use tracing::{error, info};

const MAX_BATCH_SIZE: usize = 10_000;
const MAX_BATCH_AGE: Duration = Duration::from_millis(250);

pub async fn run(tick_rx: Receiver<Vec<Tick>>, batch_tx: Sender<Vec<Tick>>) -> Result<()> {
    let mut batch: Vec<Tick> = Vec::with_capacity(MAX_BATCH_SIZE);

    let mut timer: Interval = interval(MAX_BATCH_AGE);
    timer.set_missed_tick_behavior(MissedTickBehavior::Delay);

    loop {
        tokio::select! {

            result = tick_rx.recv() => {
                let ticks = match result {
                    Ok(t) => t,
                    Err(_) => {
                        error!("Tick channel closed");

                        if !batch.is_empty() {
                            batch_tx.send(batch).await?;
                        }

                        info!("Shutting down...");
                        process::exit(0);
                    }
                };

                batch.extend(ticks);

                if batch.len() >= MAX_BATCH_SIZE {
                    info!("Dispatching batch: {} ticks", batch.len());

                    batch_tx.send(batch).await?;

                    batch = Vec::with_capacity(MAX_BATCH_SIZE);
                }
            }

            _ = timer.tick() => {
                if !batch.is_empty() {
                    info!("Dispatching batch (timeout): {} ticks", batch.len());

                    batch_tx.send(batch).await?;

                    batch = Vec::with_capacity(MAX_BATCH_SIZE);
                }
            }
        }
    }

    Ok(())
}
