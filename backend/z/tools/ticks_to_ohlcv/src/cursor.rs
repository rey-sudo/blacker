use crate::binance::Ohlcv;
use ciborium::from_reader;
use ciborium::ser::into_writer;
use csv::ReaderBuilder;
use cursor_db::cursor::CursorDB;
use serde::{Deserialize, Serialize};
use std::error::Error;
use std::fs;
use std::path::Path;

pub fn ohlcv_csv_to_cursordb(
    csv_path: &str,
    data_path: &str,
    index_path: &str,
) -> Result<(), Box<dyn Error>> {
    println!("🧹 Verificando archivos antiguos...");

    if Path::new(data_path).exists() {
        fs::remove_file(data_path)?;
        println!("🗑 Eliminado archivo viejo: {}", data_path);
    }

    // 🔥 Borrar archivo index si existe
    if Path::new(index_path).exists() {
        fs::remove_file(index_path)?;
        println!("🗑 Eliminado archivo viejo: {}", index_path);
    }

    println!("📄 Abriendo CSV OHLCV...");

    let mut rdr: csv::Reader<fs::File> =
        ReaderBuilder::new().has_headers(true).from_path(csv_path)?;

    println!("💾 Abriendo CursorDB...");

    let mut db: CursorDB = CursorDB::open_or_create(data_path, index_path)?;

    let mut inserted: u64 = 0;

    println!("🔄 Insertando registros en modo streaming...");

    for result in rdr.deserialize() {
        let candle: Ohlcv = result?;

        let mut payload = Vec::new();

        into_writer(&candle, &mut payload)?; // rompe si falla serialización

        db.insert(candle.timestamp as i64, &payload)?; // rompe si falla DB

        inserted += 1;
    }

    println!("✔ Proceso finalizado. {} registros insertados.", inserted);

    Ok(())
}

pub fn print_cursordb_ohlcv(data_path: &str, index_path: &str) -> Result<(), Box<dyn Error>> {
    // Abrir o crear la base
    let mut db = CursorDB::open_or_create(data_path, index_path)?;

    println!("🔎 Iterando CursorDB...");

    // Posicionar en el primer registro
    db.move_to_first()?;

    // Iteración streaming
    while let Some(record) = db.next()? {
        let payload: Vec<u8> = record.payload;

        // Deserializar CBOR a Ohlcv
        let candle: Ohlcv = from_reader(&payload[..]).map_err(|e| {
            eprintln!("❌ Error deserializando CBOR: {}", e);
            e
        })?;

        // Imprimir struct completo
        println!("{:#?}", candle);
    }

    println!("✔ Todos los registros han sido leídos.");

    Ok(())
}
