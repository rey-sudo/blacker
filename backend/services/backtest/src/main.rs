use csv::{ByteRecord, ReaderBuilder};
use cursor_db::cursor::CursorDB;
use rkyv::{Archive, Serialize};
use tracing::info;
use std::error::Error;
use std::fs::File;
use std::io::BufReader;
use std::{fs, path::Path};

#[derive(Archive, Serialize)]
pub struct Trade {
    id: u64,
    price: f64,
    qty: f64,
    quote_qty: f64,
    time: i64,
    is_buyer_maker: bool,
    //is_best_match: bool,
}

fn iterate_csv_file(mut db: CursorDB) -> Result<(), Box<dyn Error>> {
    let file: File = File::open("./input/BTCUSD_PERP-trades-2026-02_grouped.csv")?;

    let reader: BufReader<File> = BufReader::with_capacity(1024 * 1024 * 16, file);

    let mut csv: csv::Reader<BufReader<File>> =
        ReaderBuilder::new().has_headers(false).from_reader(reader);

    let mut row: ByteRecord = ByteRecord::new();
    
    info!("Running csv iteration");

    while csv.read_byte_record(&mut row)? {
        let trade: Trade = Trade {
            id: std::str::from_utf8(&row[0])?.parse()?,
            price: std::str::from_utf8(&row[1])?.parse()?,
            qty: std::str::from_utf8(&row[2])?.parse()?,
            quote_qty: std::str::from_utf8(&row[3])?.parse()?,
            time: std::str::from_utf8(&row[4])?.parse()?,
            is_buyer_maker: row[5] == b"True"[..],
            //is_best_match: row[6] == b"True"[..],
        };

        let payload: rkyv::util::AlignedVec = rkyv::to_bytes::<rkyv::rancor::Error>(&trade)?;

        match db.insert(trade.time, &payload) {
            Ok(_) => {
                //println!("✔ Record Saved: TS {}", trade.time);
            }
            Err(e) => {
                eprintln!("🗙 Insert Error: {}", e);
            }
        }
    }

    match db.move_to_first() {
        Ok(Some(record)) => {
            println!("Moved to first: {}", record.timestamp);
        }

        Ok(None) => {
            println!("There is no first position");
        }

        Err(e) => {
            eprintln!("Moved to first error: {}", e);
        }
    }

    Ok(())
}

fn delete_input_content(
    data_path: &str,
    index_path: &str,
) -> Result<(), Box<dyn std::error::Error>> {
    for path in &[data_path, index_path] {
        if Path::new(path).exists() {
            fs::remove_file(path)?;
            println!("Deleted previous file: {}", path);
        }
    }

    Ok(())
}

fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Define file paths
    let data_path: &str = "./data/data.cdb";
    let index_path: &str = "./data/index.cdbi";

    delete_input_content(data_path, index_path)?;

    let mut db: CursorDB = CursorDB::new(data_path, index_path)?;

    iterate_csv_file(db)?;

    Ok(())
}
