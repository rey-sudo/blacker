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
use anyhow::{Result, anyhow};
use async_channel::Receiver;
use tracing::{error, info};
async fn write_batch(batch: Vec<Tick>) -> Result<()> {
    Ok(())
}

pub async fn run(batch_rx: Receiver<Vec<Tick>>) -> Result<()> {
    loop {
        let batch: Vec<Tick> = batch_rx
            .recv()
            .await
            .map_err(|_| anyhow!("batch channel closed"))?;

        info!("Writing batch: {} ticks", batch.len());

        if let Err(err) = write_batch(batch).await {
            error!("Failed to write batch: {err:?}");
        }
    }
}
