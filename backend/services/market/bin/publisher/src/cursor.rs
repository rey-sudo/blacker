use anyhow::Result;
use clickhouse::{Client, Row};
use serde::Deserialize;

#[derive(Debug, Clone)]
pub struct Cursor {
    pub time: u64,
    pub id: u64,
}

#[derive(Row, Deserialize)]
pub struct CursorRow {
    pub last_time: u64,
    pub last_id: u64,
}

pub async fn load_cursor(db: &Client, source: &str) -> Result<Cursor> {
    let row = db
        .query(
            r#"
            SELECT
                last_time,
                last_id
            FROM publisher_cursor FINAL
            WHERE source = ?
              AND symbol = ?
            LIMIT 1
            "#,
        )
        .bind(source)
        .bind(symbol)
        .fetch_optional::<CursorRow>()
        .await?;

    Ok(match row {
        Some(r) => Cursor {
            time: r.last_time,
            id: r.last_id,
        },
        None => Cursor { time: 0, id: 0 },
    })
}

pub async fn save_cursor(cursor: &Cursor) -> Result<()> {
    todo!()
}

pub async fn load_ticks(cursor: &Cursor, limit: usize) -> Result<Vec<Tick>> {
    todo!()
}
