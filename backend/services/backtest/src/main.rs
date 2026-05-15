use backtest::{app::model::Trade, utils::csv_to_cursor};
use cursor_db::{cursor::CursorDB, record::Record};
use std::{thread, time::Duration};

fn iterate_cursor(mut db: CursorDB) {
    loop {
        match db.next() {
            Ok(Some(Record { timestamp, payload })) => {
                
                match bincode::deserialize::<Trade>(&payload) {
                    Ok(trade) => {
                        println!("Trade: {:?}", timestamp);
                    }
                    Err(e) => {
                        eprintln!("Deserialize error: {}", e);
                    }
                }
            }
            Ok(None) => {
                println!("No more records following");
                break;
            }
            Err(e) => {
                eprintln!("Moved to next error: {}", e);
                break;
            }
        }

        thread::sleep(Duration::from_secs(1));
    }
}

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let csv_path: &str = "./input/BTCUSDT-trades-2026-05-06_grouped.csv";

    let data_path: &str = "./data/data.cdb";
    let index_path: &str = "./data/index.cdbi";

    let mut db: CursorDB = CursorDB::new(data_path, index_path)?;

    //csv_to_cursor(db, csv_path)?;

    iterate_cursor(db);

    Ok(())
}
