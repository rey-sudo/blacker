use anyhow::{Context, Result};
use serde::Deserialize;

#[derive(Debug, Deserialize)]
struct Tick {
    trade_id: i64,
    price: f64,
    qty: f64,
    first_trade_id: i64,
    last_trade_id: i64,
    ts_us: i64,
    is_buyer_maker: String,
    is_best_match: String,
}


pub fn verify_ticks_ordered(csv_path: &str) -> Result<()> {
    let file: std::fs::File = std::fs::File::open(csv_path).context("failed to open tick csv")?;

    let mut rdr = csv::ReaderBuilder::new()
        .has_headers(false)
        .from_reader(file);

    let mut prev_ts: Option<i64> = None;

    for (row, result) in rdr.deserialize::<Tick>().enumerate() {
        let tick: Tick = result.with_context(|| format!("csv error at row {}", row))?;

        //println!("{:?}", tick.ts_us);

        if let Some(prev) = prev_ts {
            if tick.ts_us < prev {
                anyhow::bail!(
                    "ticks not ordered at row {}: {} < {}",
                    row,
                    tick.ts_us,
                    prev
                );
            }
        }

        prev_ts = Some(tick.ts_us);
    }

    println!("CSV checked");

    Ok(())
}
