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

use crate::{
    batch::read_batch,
    config::Config,
    cursor::{PublisherCursor, load_cursors, save_cursors},
    models::{Symbol, Tick},
};
use anyhow::{Context, Result};
use clickhouse::Client;
use pulsar::{
    Error as PulsarError, Producer, SerializeMessage, TokioExecutor,
    producer::{self},
};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use tracing::info;

//----------------------------------------------------------------------------------------------------------------------
// PUBLISHER LOGIC
//----------------------------------------------------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TickBatchMessage {
    pub ticks: Vec<Tick>,
}

impl SerializeMessage for TickBatchMessage {
    fn serialize_message(input: Self) -> Result<producer::Message, PulsarError> {
        let payload: Vec<u8> =
            rmp_serde::to_vec(&input).map_err(|e| PulsarError::Custom(e.to_string()))?;

        Ok(producer::Message {
            payload,
            ..Default::default()
        })
    }
}

pub async fn publish_batch(
    producers: &mut HashMap<Symbol, Producer<TokioExecutor>>,
    batches: &HashMap<Symbol, Vec<Tick>>,
) -> Result<()> {
    for (symbol, ticks) in batches {
        let producer: &mut Producer<TokioExecutor> = producers
            .get_mut(symbol.as_str())
            .context(format!("Producer not found for symbol {symbol}"))?;

        let send_future = producer
            .send_non_blocking(TickBatchMessage {
                ticks: ticks.clone(),
            })
            .await
            .context(format!("Failed to send batch for {symbol}"))?;

        send_future
            .await
            .context(format!("Failed to receive ack for {symbol}"))?;
    }

    Ok(())
}

pub async fn run(
    db: Client,
    mut producers: HashMap<Symbol, Producer<TokioExecutor>>,
    config: Config,
) -> Result<()> {
    let symbols: Vec<&str> = config
        .symbols
        .split(',')
        .map(str::trim)
        .filter(|s: &&str| !s.is_empty())
        .collect();

    let mut cursors: HashMap<Symbol, PublisherCursor> =
        load_cursors(&db, &config, &symbols).await?;

    info!("Running main loop.");

    loop {
        let batches: HashMap<Symbol, Vec<Tick>> =
            read_batch(&db, &config, &symbols, &cursors).await?;

        publish_batch(&mut producers, &batches).await?;

        save_cursors(&db, &mut cursors, &batches).await?;
    }
}
