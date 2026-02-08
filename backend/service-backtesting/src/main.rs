use polars::prelude::*;
use service_backtesting::application::engine::BacktestEngine;
use std::{fs::File, thread};

fn convert_csv_to_parquet(csv_path: &str, parquet_path: &str) -> PolarsResult<()> {
    // En versiones modernas, usamos CsvReadOptions para configurar la lectura
    let mut df: DataFrame = CsvReadOptions::default()
        .with_has_header(false) // IMPORTANTE: Tu CSV no tiene cabeceras
        .with_infer_schema_length(Some(100)) // Analiza las primeras 100 filas para tipos
        .try_into_reader_with_file_path(Some(csv_path.into()))?
        .finish()?;

    // Preparar el archivo de salida
    let file: File = File::create(parquet_path).map_err(PolarsError::from)?;

    // Escribir a Parquet
    ParquetWriter::new(file).finish(&mut df)?;

    Ok(())
}

fn main() -> PolarsResult<()> {

    let path_parquet: &str = "data/BTCUSDT-aggTrades-2026-02-07.parquet";

    // 2. Inicializar motor
    println!("Cargando motor de backtesting...");
    let engine: BacktestEngine = BacktestEngine::new(path_parquet)?;
    println!("Motor listo. Ticks totales: {}", engine.total_ticks);


    engine.play(1); 
    
    thread::sleep(std::time::Duration::from_secs(10));
    
    engine.pause();
    
    engine.mostrar_tick_actual();

    Ok(())
}