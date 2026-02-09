use polars::prelude::*;

pub fn read_ohlcv_range(
    parquet_glob: &str,
    start_ts: i64,
    end_ts: i64,
) -> PolarsResult<DataFrame> {
    let lf: LazyFrame = LazyFrame::scan_parquet(
        parquet_glob.into(),
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
