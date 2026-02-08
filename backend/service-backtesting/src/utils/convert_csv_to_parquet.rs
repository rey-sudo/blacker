use polars::prelude::*;
use std::fs::File;

fn convert_csv_to_parquet(csv_path: &str, parquet_path: &str) -> PolarsResult<()> {
    // 1. Leer el CSV
    // El método CsvReader infiere los tipos de datos automáticamente
    let mut df = CsvReader::from_path(csv_path)?
        .has_header(false) // Tu ejemplo no parece tener encabezados
        .finish()?;

    // 2. Crear el archivo de destino
    let file = File::create(parquet_path).expect("No se pudo crear el archivo");

    // 3. Escribir el DataFrame en formato Parquet
    ParquetWriter::new(file)
        .finish(&mut df)?;

    println!("Conversión completada con éxito: {}", parquet_path);
    Ok(())
}

fn main() {
    let result = convert_csv_to_parquet("datos.csv", "datos.parquet");
    if let Err(e) = result {
        eprintln!("Error convirtiendo el archivo: {}", e);
    }
}