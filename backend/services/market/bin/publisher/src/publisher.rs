use crate::{cursor::{Cursor, load_cursor}, models::Tick};
use anyhow::Result;
use clickhouse::Client;
use std::{collections::HashSet, time::Duration};

const BATCH_SIZE: usize = 10_000;


async fn publish_to_pulsar(tick: &Tick) -> Result<()> {
    todo!()
}

pub async fn publisher_loop(db: &Client) -> Result<()> {
    let source: &str = "dydx";
    let symbol: &str = "BTC-USD";
    loop {
        let cursor: Cursor = load_cursor(db, source, symbol).await?;

        let ticks: Vec<Tick> = load_ticks(&cursor, BATCH_SIZE).await?;

        if ticks.is_empty() {
            tokio::time::sleep(Duration::from_millis(100)).await;
            continue;
        }

        // Elimina duplicados del mismo lote
        let mut seen = HashSet::with_capacity(ticks.len());

        // Último tick publicado correctamente
        let mut last_cursor: Option<Cursor> = None;

        for tick in ticks {
            // Duplicado dentro del lote
            if !seen.insert((tick.time, tick.id)) {
                continue;
            }

            // Publicar a Pulsar
            publish_to_pulsar(&tick).await?;

            // Avanzar cursor solamente después de publicar
            last_cursor = Some(Cursor {
                time: tick.time,
                id: tick.id,
            });
        }

        // Persistir cursor
        if let Some(cursor) = last_cursor {
            save_cursor(&cursor).await?;
        }
    }
}
