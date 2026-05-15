use csv::{ByteRecord, ReaderBuilder};
use cursor_db::cursor::CursorDB;
use std::error::Error;
use std::fs::File;
use std::io::BufReader;
use crate::app::model::Trade;

pub fn csv_to_cursor(mut db: CursorDB, csv_path: &str) -> Result<(), Box<dyn Error>> {
    let file: File = File::open(csv_path)?;

    let reader: BufReader<File> = BufReader::with_capacity(1024 * 1024 * 16, file);

    let mut csv: csv::Reader<BufReader<File>> =
        ReaderBuilder::new().has_headers(false).from_reader(reader);

    let mut row: ByteRecord = ByteRecord::new();

    println!("Running csv iteration");

    while csv.read_byte_record(&mut row)? {
        let trade: Trade = Trade {
            id: std::str::from_utf8(&row[0])?.parse()?,
            price: std::str::from_utf8(&row[1])?.parse()?,
            qty: std::str::from_utf8(&row[2])?.parse()?,
            quote_qty: std::str::from_utf8(&row[3])?.parse()?,
            time: std::str::from_utf8(&row[4])?.parse()?,
            is_buyer_maker: row[5] == b"True"[..],
        };

        let payload: Vec<u8> = bincode::serialize(&trade)?;

        match db.insert(trade.time, &payload) {
            Ok(_) => {
                // println!("✔ Record Saved: TS {}", trade.time);
            }
            Err(e) => {
                eprintln!("🗙 Insert Error: {}", e);
            }
        }
    }

    Ok(())
}