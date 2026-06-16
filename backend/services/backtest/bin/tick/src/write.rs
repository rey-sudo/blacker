use crate::model::Trade;
use anyhow::{Context, Result};
use tracing::info;
use std::{
    fs::{File, OpenOptions},
    io::{BufRead, BufReader, BufWriter, Write},
};

//----------------------------------------------------------------------------------------------------------------------
// CONSTANTS
//----------------------------------------------------------------------------------------------------------------------

/// Scale factor used to convert floating-point prices and quantities into
/// fixed-point `u64` integers, preserving up to 8 decimal places.
///
/// Example: 0.00123456 → 123_456 (stored as u64)
pub const SCALE: f64 = 100_000_000.0;

//----------------------------------------------------------------------------------------------------------------------
// AUXILIAR
//----------------------------------------------------------------------------------------------------------------------

/// Parses a string slice into a `u8` boolean representation.
///
/// # Returns
/// - `Ok(1)` for `"true"`
/// - `Ok(0)` for `"false"`
///
/// # Errors
/// Returns an error if the input is neither `"true"` nor `"false"`.
fn parse_bool(s: &str) -> Result<u8> {
    match s.trim().to_ascii_lowercase().as_str() {
        "true" => Ok(1),
        "false" => Ok(0),
        other => anyhow::bail!("invalid boolean value: {:?}", other),
    }
}

/// Parses a single CSV line into a [`Trade`] struct.
///
/// Expected column order:
/// `trade_id, price, qty, quote_qty (ignored), timestamp_ms, is_buyer_maker`
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

    // Helper closure: advances the iterator and returns a context-rich error
    // if the column is absent.
    let mut next_col = |name: &str| -> Result<&str> {
        cols.next()
            .ok_or_else(|| anyhow::anyhow!("row {row}: missing column `{name}`"))
    };

    let trade_id: u64 = next_col("trade_id")?
        .trim()
        .parse()
        .with_context(|| format!("row {row}: invalid `trade_id`"))?;

    let price_f: f64 = next_col("price")?
        .trim()
        .parse()
        .with_context(|| format!("row {row}: invalid `price`"))?;
    
    anyhow::ensure!(price_f >= 0.0, "negative price: {price_f}");

    let qty_f: f64 = next_col("qty")?
        .trim()
        .parse()
        .with_context(|| format!("row {row}: invalid `qty`"))?;

    // Convert to fixed-point. `round()` prevents truncation errors from
    // floating-point imprecision (e.g. 1.005 * SCALE = 100_499_999.99...).
    let price: u64 = (price_f * SCALE).round() as u64;
    let qty: u64 = (qty_f * SCALE).round() as u64;

    // `quote_qty` is part of the schema but not used in this pipeline.
    // We still validate its presence so column offsets remain correct.
    next_col("quote_qty")?;

    let timestamp_ms: u64 = next_col("timestamp_ms")?
        .trim()
        .parse()
        .with_context(|| format!("row {row}: invalid `timestamp_ms`"))?;

    let is_buyer_maker: u8 = parse_bool(next_col("is_buyer_maker")?)
        .with_context(|| format!("row {row}: invalid `is_buyer_maker`"))?;

    Ok(Trade {
        trade_id,
        price,
        qty,
        timestamp_ms,
        is_buyer_maker,
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
