use polars::prelude::*;
use service_backtesting::application::engine::{BacktestEngine, Candle};
use std::thread;

fn main() {
    let engine: Arc<BacktestEngine> = Arc::new(
        BacktestEngine::new("data/BTCUSDT-aggTrades-2026-02-07.parquet")
            .expect("Error al cargar el motor"),
    );

    let engine_play: Arc<BacktestEngine> = Arc::clone(&engine);
    engine_play.play(0);

    engine_play.mostrar_tick_actual();

    thread::sleep(std::time::Duration::from_millis(100));

    // Mientras el motor esté activo o queramos monitorear
    while engine.is_playing.load(std::sync::atomic::Ordering::Relaxed)
        || engine.cursor.load(std::sync::atomic::Ordering::Relaxed) < engine.total_ticks - 1
    {
        // Obtener la vela actual de 1 minuto (60,000 ms)
        if let Some(live_candle) = engine.get_live_candle(60_000) {
            println!(
                "TS: {} | O: {:.2} | H: {:.2} | L: {:.2} | C: {:.2} | Vol: {:.2}",
                live_candle.timestamp,
                live_candle.open,
                live_candle.high,
                live_candle.low,
                live_candle.close,
                live_candle.volume
            );
        } else {
            println!("Esperando datos...");
        }

        thread::sleep(std::time::Duration::from_secs(1));
    }

    let candles = engine_play.get_ohlcv(60_000, 5);

    let candles_sec: Vec<Candle> = candles
        .into_iter()
        .map(|mut c| {
            c.timestamp /= 1_000_000;
            c
        })
        .collect();

   let json = serde_json::to_string_pretty(&candles_sec).unwrap();
   println!("{}", json);
   
}
