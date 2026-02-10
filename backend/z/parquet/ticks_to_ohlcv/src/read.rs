use polars::prelude::*;

pub fn read_ohlcv_range(
    parquet_path: &str,
    start_ts: i64,
    end_ts: i64,
) -> PolarsResult<DataFrame> {
    let lf: LazyFrame = LazyFrame::scan_parquet(
        parquet_path.into(),
        ScanArgsParquet::default(),
    )?;

    let df: DataFrame = lf
        .select([
            col("ts"),
            col("open"),
            col("high"),
            col("low"),
            col("close"),
            col("volume"),
            col("first_tick_ts"),
            col("last_tick_ts"),
        ])
        .filter(
            col("ts")
                .gt_eq(lit(start_ts))
                .and(col("ts").lt(lit(end_ts))),
        )
        .collect()?;

    Ok(df)
}



pub fn ohlcv_bounds(
    parquet_path: &str,
) -> PolarsResult<(i64, i64)> {
    let lf = LazyFrame::scan_parquet(
        parquet_path.into(),
        ScanArgsParquet {
            low_memory: true,
            ..Default::default()
        },
    )?;

    let df = lf
        .select([
            col("ts").min().alias("min_ts"),
            col("ts").max().alias("max_ts"),
        ])
        .collect()?;

    let min_ts: i64 = df.column("min_ts")?.i64()?.get(0).unwrap();
    let max_ts: i64 = df.column("max_ts")?.i64()?.get(0).unwrap();

    Ok((min_ts, max_ts))
}


pub fn read_ohlcv_from(
    parquet_path: &str,
    start_ts: i64,
    length: IdxSize,
) -> PolarsResult<DataFrame> {
    let lf = LazyFrame::scan_parquet(
        parquet_path.into(),
        ScanArgsParquet {
            low_memory: true,
            ..Default::default()
        },
    )?;

    let df = lf
        .filter(col("ts").gt_eq(lit(start_ts)))
        .slice(0, length)
        .select([
            col("ts"),
            col("open"),
            col("high"),
            col("low"),
            col("close"),
            col("volume"),
            col("first_tick_ts"),
            col("last_tick_ts"),
        ])
        .collect()?;

    Ok(df)
}

