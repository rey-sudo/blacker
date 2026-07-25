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
use clickhouse::{Client, insert::Insert};
use tracing::{error, info};

async fn write_batch(db: &Client, batch: Vec<Tick>) -> Result<()> {
    info!(?batch);

    let mut insert: Insert<Tick> = db.insert::<Tick>("ticks").await?;

    for tick in &batch {
        insert.write(tick).await?;
    }

    insert.end().await?;

    Ok(())
}

pub async fn run(db: Client, batch_rx: Receiver<Vec<Tick>>) -> Result<()> {
    loop {
        let batch: Vec<Tick> = batch_rx
            .recv()
            .await
            .map_err(|_| anyhow!("batch channel closed"))?;

        info!("Writing batch: {} ticks", batch.len());

        if let Err(err) = write_batch(&db, batch).await {
            error!("Failed to write batch: {err:?}");
        }
    }
}
