use csv::{ByteRecord, ReaderBuilder};
use std::error::Error;

pub fn validate_ticks_sorted(csv_path: &str) -> Result<(), Box<dyn Error>> {
    let mut rdr = ReaderBuilder::new()
        .has_headers(false)
        .from_path(csv_path)?;

    let mut record = ByteRecord::new();
    let mut prev_timestamp: Option<u64> = None;
    let mut line_number: u64 = 0;

    while rdr.read_byte_record(&mut record)? {
        line_number += 1;

        // Columna 6 (índice 5) → timestamp en microsegundos
        let ts_bytes = record
            .get(5)
            .ok_or("No se encontró columna timestamp")?;

        let timestamp: u64 = std::str::from_utf8(ts_bytes)?.parse()?;

        if let Some(prev) = prev_timestamp {
            if timestamp < prev {
                return Err(format!(
                    "CSV desordenado en línea {}: {} < {}",
                    line_number,
                    timestamp,
                    prev
                )
                .into());
            }
        }

        prev_timestamp = Some(timestamp);
    }

    println!("✔ El archivo está correctamente ordenado por timestamp.");
    Ok(())
}
