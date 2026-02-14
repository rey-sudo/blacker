use ticks_to_ohlcv::{binance::run, chart::draw_ohlcv_chart};

fn main() -> std::io::Result<()> {
    let csv_path: &str = "./data/ticks_BTCUSDT_1_day.csv";
    let output_path: &str = "./data/ohlcv_BTCUSDT_1_day.csv";
    let chart_output:&str = "./data/chart.html";
    let timeframe_ms: u64 = 3_600_000;

    if let Err(e) = run(csv_path, output_path, timeframe_ms, false) {
        eprintln!("Error crítico: {}", e);
        std::process::exit(1);
    }

    if let Err(e) = draw_ohlcv_chart(output_path, chart_output) {
        eprintln!("Error al generar gráfico: {}", e);
    }

    //=========================================================================

    // Define file paths
    let data_path: &str = "./data/data.cdb";
    let index_path: &str = "./data/index.cdbi";

    /*
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
    */
    Ok(())
}
