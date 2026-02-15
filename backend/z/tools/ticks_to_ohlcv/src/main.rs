use ticks_to_ohlcv::{
    binance::{run},
    chart::draw_ohlcv_chart,
    cursor::{ohlcv_csv_to_cursordb, print_cursordb_ohlcv},
};

fn main() -> std::io::Result<()> {
    let csv_path: &str = "./data/ticks_BTCUSDT_1_day.csv";
    let output_path: &str = "./data/ohlcv_BTCUSDT_1_day.csv";
    let chart_output: &str = "./data/chart.html";
    let timeframe_ms: u64 = 3_600_000;
    let data_path: &str = "./data/data.cdb";
    let index_path: &str = "./data/index.cdbi";

    if let Err(e) = run(csv_path, output_path, timeframe_ms, false) {
        eprintln!("Error crítico: {}", e);
        std::process::exit(1);
    }

    if let Err(e) = draw_ohlcv_chart(output_path, chart_output) {
        eprintln!("Error al generar gráfico: {}", e);
        std::process::exit(1);
    }

    if let Err(e) = ohlcv_csv_to_cursordb(output_path, data_path, index_path) {
        eprintln!("❌ Error: {}", e);
        std::process::exit(1);
    }

    if let Err(e) = print_cursordb_ohlcv(data_path, index_path) {
        eprintln!("❌ Error: {}", e);
        std::process::exit(1);
    }

    Ok(())
}
