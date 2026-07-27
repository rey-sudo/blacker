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

use crate::config::Config;
use crate::models::Symbol;
use crate::{cursor::PublisherCursor, models::Tick};
use anyhow::Result;
use clickhouse::Client;
use clickhouse::query::RowCursor;
use std::collections::HashMap;

/// Reads the next batch of ticks for each symbol.
///
/// Only ticks newer than the current cursor position are retrieved. Duplicate
/// ticks within each batch are removed before returning the results.
///
/// # Arguments
/// * `db` - Database client used to read tick data.
/// * `config` - Application configuration.
/// * `symbols` - List of symbols to read.
/// * `cursors` - Current publishing cursor for each symbol.
///
/// # Returns
/// A map containing the next batch of ticks for each symbol with available data.
pub async fn read_batch(
    db: &Client,
    config: &Config,
    symbols: &Vec<&str>,
    cursors: &HashMap<Symbol, PublisherCursor>,
) -> Result<HashMap<Symbol, Vec<Tick>>> {
    let mut batches: HashMap<Symbol, Vec<Tick>> = HashMap::new();

    for &symbol in symbols {
        let cursor: &PublisherCursor = cursors.get(symbol).expect("cursor not found");

        let mut rows: RowCursor<Tick> = db
            .query(
                "
            SELECT
                source,
                symbol,
                id,
                time,
                price,
                qty,
                is_buyer_maker
            FROM ticks
            WHERE source = ?
              AND symbol = ?
              AND (
                    time > ?
                 OR (time = ? AND id > ?)
              )
            ORDER BY time, id
            LIMIT ?
            ",
            )
            .bind(&config.source)
            .bind(symbol)
            .bind(cursor.last_time)
            .bind(cursor.last_time)
            .bind(&cursor.last_id)
            .bind(config.batch_size as u64)
            .fetch::<Tick>()?;

        let mut symbol_batch: Vec<Tick> = Vec::new();

        while let Some(tick) = rows.next().await? {
            symbol_batch.push(tick);
        }

        symbol_batch.dedup_by(|a: &mut Tick, b: &mut Tick| a.id == b.id);

        if !symbol_batch.is_empty() {
            batches.insert(symbol.to_string(), symbol_batch);
        }
    }

    Ok(batches)
}
