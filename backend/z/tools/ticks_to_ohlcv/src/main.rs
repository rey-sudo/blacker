use cursor_db::cursor::CursorDB;
use cursor_db::cursor::DBStats;
use std::fs;
use std::path::Path;
fn main() -> std::io::Result<()> {
    // Define file paths
    let data_path: &str = "./data/data.cdb";
    let index_path: &str = "./data/index.cdbi";

    //=========================================================================

    // Create database
    let mut db: CursorDB = CursorDB::open_or_create(data_path, index_path)?;

    let total_records: u64 = 20;

    // Create records
    for i in 0..total_records {
        let timestamp: i64 = 1_000_000_000 + i as i64;
        let payload: Vec<u8> = format!("payload-{}", i).into_bytes();

        match db.insert(timestamp, &payload) {
            Ok(_) => {
                println!("✔ Record Saved: TS {}", timestamp);
            }
            Err(e) => {
                eprintln!("🗙 Insert Error: {}", e);
            }
        }
    }

    //Display stats
    let stats: DBStats = db.stats()?;
    println!("{}", stats);

    Ok(())
}
