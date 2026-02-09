use anyhow::Result;
use csv::ReaderBuilder;
use std::collections::BTreeMap;
use ticks_to_ohlcv::{candle::Candle, parquet::{write_parquet}, tick::Tick};

const INTERVAL_US: i64 = 60_000_000; // 1 minuto en microsegundos

fn bucket_ts(ts: i64) -> i64 {
    (ts / INTERVAL_US) * INTERVAL_US
}

fn main() -> Result<()> {
    let mut rdr: csv::Reader<std::fs::File> = ReaderBuilder::new()
        .has_headers(false)
        .from_path("data/BTCUSDT-4-year-ticks.csv")?;

    let mut candles: BTreeMap<i64, Candle> = BTreeMap::new();

    for result in rdr.deserialize() {
        let tick: Tick = result?;

        let bucket: i64 = bucket_ts(tick.T);

        candles
            .entry(bucket)
            .and_modify(|c| c.update(&tick))
            .or_insert_with(|| Candle::new(bucket, &tick));
    }

    let ohlcv: Vec<Candle> = candles.into_values().collect();

    write_parquet("data/ohlcv.parquet", &ohlcv)?;

    Ok(())
}
