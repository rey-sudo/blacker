use anyhow::Result;
use polars::prelude::*;

use crate::candle::Candle;

pub fn write_parquet(path: &str, candles: &[Candle]) -> Result<()> {
    let columns = vec![
        Column::from(Series::new(
            "ts".into(),
            candles.iter().map(|c| c.ts).collect::<Vec<_>>(),
        )),
        Column::from(Series::new(
            "open".into(),
            candles.iter().map(|c| c.open).collect::<Vec<_>>(),
        )),
        Column::from(Series::new(
            "high".into(),
            candles.iter().map(|c| c.high).collect::<Vec<_>>(),
        )),
        Column::from(Series::new(
            "low".into(),
            candles.iter().map(|c| c.low).collect::<Vec<_>>(),
        )),
        Column::from(Series::new(
            "close".into(),
            candles.iter().map(|c| c.close).collect::<Vec<_>>(),
        )),
        Column::from(Series::new(
            "volume".into(),
            candles.iter().map(|c| c.volume).collect::<Vec<_>>(),
        )),
        Column::from(Series::new(
            "first_tick_ts".into(),
            candles.iter().map(|c| c.first_tick_ts).collect::<Vec<_>>(),
        )),
        Column::from(Series::new(
            "last_tick_ts".into(),
            candles.iter().map(|c| c.last_tick_ts).collect::<Vec<_>>(),
        )),
        Column::from(Series::new(
            "first_trade_id".into(),
            candles.iter().map(|c| c.first_trade_id).collect::<Vec<_>>(),
        )),
        Column::from(Series::new(
            "last_trade_id".into(),
            candles.iter().map(|c| c.last_trade_id).collect::<Vec<_>>(),
        )),
    ];

    let mut df: DataFrame = DataFrame::new_infer_height(columns)?;

    let mut file: std::fs::File = std::fs::File::create(path)?;

    ParquetWriter::new(&mut file)
        .with_compression(ParquetCompression::Zstd(None))
        .finish(&mut df)?;

    Ok(())
}
