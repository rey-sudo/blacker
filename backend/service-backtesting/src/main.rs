use polars::prelude::*;
use service_backtesting::application::engine::BacktestEngine;
use std::thread;

fn main() -> PolarsResult<()> {
    let path_parquet: &str = "data/BTCUSDT-aggTrades-2026-02-07.parquet";


    println!("Cargando motor de backtesting...");

    
    let engine: BacktestEngine = BacktestEngine::new(path_parquet)?;
    
    println!("Motor listo running in 5s. Ticks totales: {}", engine.total_ticks);
    thread::sleep(std::time::Duration::from_secs(5));

    engine.play(1);

    thread::sleep(std::time::Duration::from_secs(10));

    engine.pause();

    engine.mostrar_tick_actual();

    let timeframe: i64 = 60 * 1000; // 1 minuto en ms
    let history = engine.get_ohlcv(timeframe, 500);

    if let Some(actual) = history.last() {
        println!(
            "Vela actual - Open: {}, Close: {}, Vol: {}",
            actual.open, actual.close, actual.volume
        );
    }

    Ok(())
}
