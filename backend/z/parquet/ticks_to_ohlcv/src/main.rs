use anyhow::Result;
use csv::ReaderBuilder;
use polars::prelude::*;
use std::collections::BTreeMap;
use ticks_to_ohlcv::{candle::Candle, parquet::write_parquet, read::read_ohlcv_range, tick::Tick};

const H1: i64 = 3_600_000_000;
const M1: i64 = 60_000_000;

const INTERVAL_US: i64 = H1;

fn bucket_ts(ts: i64) -> i64 {
    (ts / INTERVAL_US) * INTERVAL_US
}

fn main() -> Result<()> {
    let mut rdr: csv::Reader<std::fs::File> = ReaderBuilder::new()
        .has_headers(false)
        .from_path("data/BTCUSDT_ticks_4_year.csv")?;

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

    write_parquet("data/BTCUSDT_1h.parquet", &ohlcv)?;

    let start_ts: i64 = 1770006959 * 1_000_000;
    let end_ts: i64 = 1770680159 * 1_000_000;

    let df: DataFrame= read_ohlcv_range("data/BTCUSDT_1h.parquet", start_ts, end_ts)?;

    println!("{:?}", df);

    Ok(())
}
