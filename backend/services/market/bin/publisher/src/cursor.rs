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
use crate::models::Tick;
use anyhow::Result;
use clickhouse::Client;
use clickhouse::Row;
use clickhouse::insert::Insert;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Row, Serialize, Deserialize)]
pub struct PublisherCursor {
    pub publisher: String,
    pub source: String,
    pub symbol: String,
    pub last_time: u64,
    pub last_id: String,
    pub updated_at: u64,
}

/// Loads the persisted publishing cursor for each symbol.
///
/// If a cursor does not exist, a new one is initialized with default values,
/// allowing publishing to start from the beginning.
///
/// # Arguments
/// * `db` - Database client used to retrieve cursor state.
/// * `config` - Application configuration.
/// * `symbols` - List of symbols to load cursors for.
///
/// # Returns
/// A map of symbols to their corresponding publishing cursors.
pub async fn load_cursors(
    db: &Client,
    config: &Config,
    symbols: &Vec<&str>,
) -> Result<HashMap<Symbol, PublisherCursor>> {
    let mut cursors: HashMap<Symbol, PublisherCursor> = HashMap::new();

    for &symbol in symbols {
        let cursor: Option<PublisherCursor> = db
            .query(
                "
                SELECT
                    publisher,
                    source,
                    symbol,
                    last_time,
                    last_id,
                    updated_at
                FROM publisher_cursor
                WHERE publisher = ?
                  AND source = ?
                  AND symbol = ?
                LIMIT 1
                ",
            )
            .bind(&config.publisher_id)
            .bind(&config.source)
            .bind(symbol)
            .fetch_optional::<PublisherCursor>()
            .await?;

        match cursor {
            Some(cursor) => {
                cursors.insert(symbol.to_string(), cursor);
            }

            None => {
                cursors.insert(
                    symbol.to_string(),
                    PublisherCursor {
                        publisher: config.publisher_id.clone(),
                        source: config.source.clone(),
                        symbol: symbol.to_string(),
                        last_time: 0,
                        last_id: "".to_string(),
                        updated_at: chrono::Utc::now().timestamp_millis() as u64,
                    },
                );
            }
        }
    }

    Ok(cursors)
}

pub async fn save_cursors(
    db: &Client,
    cursors: &mut HashMap<Symbol, PublisherCursor>,
    batches: &HashMap<Symbol, Vec<Tick>>,
) -> Result<()> {
    let mut insert: Insert<PublisherCursor> = db.insert("publisher_cursor").await?;

    let now: u64 = chrono::Utc::now().timestamp_millis() as u64;

    for (symbol, ticks) in batches {
        let last: &Tick = ticks.last().expect("empty batch");

        let cursor: &mut PublisherCursor = cursors.get_mut(symbol).expect("cursor not found");

        cursor.last_time = last.time;
        cursor.last_id = last.id.clone();
        cursor.updated_at = now;

        insert.write(cursor).await?;
    }

    insert.end().await?;

    Ok(())
}
