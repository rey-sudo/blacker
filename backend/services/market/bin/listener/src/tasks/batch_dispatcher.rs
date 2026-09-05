// BLACKER
// Copyright (C) 2026 Juan José Caballero Rey
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation version 3 of the License.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program. If not, see <https://www.gnu.org/licenses/>.

use crate::models::Tick;
use anyhow::{Result, bail};
use async_channel::{Receiver, Sender};
use std::time::Duration;
use tokio::time::{Interval, MissedTickBehavior, interval};
use tracing::{info};

const MAX_BATCH_SIZE: usize = 10_000;
const MAX_BATCH_AGE: Duration = Duration::from_millis(250);

/// Collects incoming ticks into batches and dispatches them when either:
/// - the batch reaches `MAX_BATCH_SIZE`, or
/// - the batch age exceeds `MAX_BATCH_AGE`.
///
/// If the input channel closes, any pending ticks are flushed before returning
/// an error indicating the channel was closed.
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
                        if !batch.is_empty() {
                            batch_tx.send(batch).await?;
                        }

                        bail!("Tick channel closed");
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
