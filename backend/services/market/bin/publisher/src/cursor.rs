use crate::config::Config;
use crate::models::Tick;
use anyhow::Result;
use chrono::{DateTime, Utc};
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
    pub last_id: u64,
    pub updated_at: DateTime<Utc>,
}

pub async fn load_cursors(
    db: &Client,
    config: &Config,
    symbols: &[&str],
) -> Result<HashMap<String, PublisherCursor>> {
    let mut cursors: HashMap<String, PublisherCursor> = HashMap::new();

    for symbol in symbols {
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
                        last_id: 0,
                        updated_at: Utc::now(),
                    },
                );
            }
        }
    }

    Ok(cursors)
}

pub async fn save_cursors(
    db: &Client,
    cursors: &mut HashMap<String, PublisherCursor>,
    batches: &HashMap<String, Vec<Tick>>,
) -> Result<()> {
    let mut insert: Insert<PublisherCursor> =
        db.insert::<PublisherCursor>("publisher_cursor").await?;

    for (symbol, ticks) in batches {
        if let Some(last) = ticks.last() {
            let cursor: &mut PublisherCursor = cursors.get_mut(symbol).expect("cursor not found");

            cursor.last_time = last.time;
            cursor.last_id = last.id;
            cursor.updated_at = chrono::Utc::now();

            insert.write(cursor).await?;
        }
    }

    insert.end().await?;

    Ok(())
}
