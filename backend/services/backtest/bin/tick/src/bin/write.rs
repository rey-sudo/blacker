use anyhow::{Context, Result};
use rust_decimal::Decimal;
use rust_decimal::prelude::{FromStr, ToPrimitive};
use tick::model::Trade;
use std::{
    fs::{File, OpenOptions},
    io::{BufRead, BufReader, BufWriter, Write},
};
use tracing::info;

//----------------------------------------------------------------------------------------------------------------------
// CONSTANTS
//----------------------------------------------------------------------------------------------------------------------

pub const SCALE: u64 = 100_000_000;

//----------------------------------------------------------------------------------------------------------------------
// AUXILIAR
//----------------------------------------------------------------------------------------------------------------------

/// Parses a single CSV line into a [`Trade`] struct.
///
/// Expected column order:
/// `trade_id, timestamp_ms, price, qty, side`
///
/// Prices and quantities are stored as fixed-point `u64` values scaled by
/// [`SCALE`] to avoid floating-point representation issues.
///
/// # Parameters
/// - `line` – Raw CSV line string (including trailing newline).
/// - `row`  – 1-based row number, used only to enrich error messages.
///
/// # Errors
/// Returns a descriptive error if any column is missing or unparseable.
fn parse_row(line: &str, row: usize) -> Result<Trade> {
    let mut cols: std::str::Split<'_, char> = line.split(',');

    let mut next_col = |name: &str| -> Result<&str> {
        cols.next()
            .ok_or_else(|| anyhow::anyhow!("row {row}: missing column `{name}`"))
    };

    let trade_id: u64 = next_col("trade_id")?
        .trim()
        .parse()
        .with_context(|| format!("row {row}: invalid `trade_id`"))?;

    let timestamp_ms: u64 = next_col("timestamp_ms")?
        .trim()
        .parse()
        .with_context(|| format!("row {row}: invalid `timestamp_ms`"))?;

    let price = Decimal::from_str(next_col("price")?.trim())
        .with_context(|| format!("row {row}: invalid `price`"))?;

    let qty = Decimal::from_str(next_col("qty")?.trim())
        .with_context(|| format!("row {row}: invalid `qty`"))?;

    let side: u8 = match next_col("side")?.trim() {
        "BUY" => 0,
        "SELL" => 1,
        other => anyhow::bail!("row {row}: invalid side `{other}`"),
    };

    let scale = Decimal::from(SCALE);

    let price_u64: u64 = (price * scale)
        .round()
        .to_u64()
        .ok_or_else(|| anyhow::anyhow!("row {row}: price overflow"))?;

    let qty_u64: u64 = (qty * scale)
        .round()
        .to_u64()
        .ok_or_else(|| anyhow::anyhow!("row {row}: qty overflow"))?;

    Ok(Trade {
        trade_id,
        timestamp_ms,
        price: price_u64,
        qty: qty_u64,
        side,
        _padding: [0; 7],
    })
}

//----------------------------------------------------------------------------------------------------------------------
// MAIN LOGIC
//----------------------------------------------------------------------------------------------------------------------

/// Converts a CSV file of trade records into a compact binary file.
///
/// Each row in the CSV must follow this column order:
/// `trade_id, price, qty, quote_qty (ignored), timestamp_ms, is_buyer_maker`
///
/// The binary output stores one [`Trade`] struct per record, written as raw
/// bytes via [`bytemuck`]. The format is **little-endian** (native x86/ARM),
/// and is not portable across architectures with different endianness.
///
/// # Parameters
/// - `csv_path`    – Path to the input CSV file.
/// - `bin_path`    – Path to the output binary file (created or truncated).
/// - `skip_header` – Set to `true` if the CSV includes a header row to skip.
///
/// # Errors
/// Returns an error if any file operation or row parsing fails,
/// with context indicating the affected row and column.
///
/// # Example
/// ```rust
/// convert_csv_to_binary("trades.csv", "trades.bin", true)?;
/// ```
pub fn convert_csv_to_binary(csv_path: &str, bin_path: &str, skip_header: bool) -> Result<()> {
    // 1. Read CSV file. ----------------------------------------------------------------------
    let file: File =
        File::open(csv_path).with_context(|| format!("cannot open CSV file: {csv_path}"))?;

    let mut reader: BufReader<File> = BufReader::new(file);

    // 2. Prepare binary file. ----------------------------------------------------------------
    let out_file: File = OpenOptions::new()
        .create(true)
        .write(true)
        .truncate(true)
        .open(bin_path)
        .with_context(|| format!("cannot create output file: {bin_path}"))?;

    // `BufWriter` batches small writes into larger OS-level syscalls,
    // significantly improving throughput for sequential binary output.
    let mut writer: BufWriter<File> = BufWriter::new(out_file);

    // Done before the main loop to keep row counters accurate (rows_written
    // should reflect only data rows, not the header).
    if skip_header {
        let mut header: String = String::new();
        reader
            .read_line(&mut header)
            .context("failed to skip CSV header")?;
    }

    // Reusing a single `String` buffer avoids a heap allocation per line.
    // `line.clear()` resets the length to 0 but retains the allocated capacity.
    let mut line: String = String::new();
    let mut rows_read: usize = 0;
    let mut rows_written: usize = 0;

    // 3. Main loop. --------------------------------------------------------------------------
    while reader
        .read_line(&mut line)
        .context("failed to read line from CSV")?
        > 0
    {
        rows_read += 1;

        // Skip blank lines (e.g. trailing newline at end of file).
        if line.trim().is_empty() {
            line.clear();
            continue;
        }

        // Parse the row, attaching the row number to any error for easy debugging.
        let trade: Trade = parse_row(&line, rows_read)
            .with_context(|| format!("failed to parse row {rows_read}"))?;

        // `bytemuck::bytes_of` reinterprets the struct as a byte slice with
        // zero copying. Safe because `Trade` is `Pod` (plain old data).
        writer
            .write_all(bytemuck::bytes_of(&trade))
            .with_context(|| format!("failed to write row {rows_read} to binary"))?;

        rows_written += 1;

        // Reuse the buffer allocation for the next line.
        line.clear();

        if rows_written % 1_000_000 == 0 {
            info!("processed {} rows...", rows_written);
        }
    }

    // Explicitly flush the `BufWriter`. Without this, buffered data may be
    // silently lost if the destructor is called while an error is already
    // propagating (drop ignores flush errors).
    writer.flush().context("failed to flush output buffer")?;

    info!(
        "done — binary written to `{}` ({} rows written, {} rows read)",
        bin_path, rows_written, rows_read
    );

    Ok(())
}


fn main() {
    tracing_subscriber::fmt::init();

    let csv_path: &str = "./input/input.csv";
    let bin_path: &str = "./output/ticks.bin";

    let stream_key: &str = "ticks:btcusd";
    let redis_url: &str = "redis://redis-local:6379";

    let _ = convert_csv_to_binary(csv_path, bin_path, true);
}
