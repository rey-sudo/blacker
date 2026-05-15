use crate::model::Trade;
use std::{
    fs::{File, OpenOptions},
    io::{BufRead, BufReader, BufWriter, Write},
};

pub const SCALE: f64 = 100_000_000.0;

fn parse_bool(s: &str) -> u8 {
    match s.trim() {
        "true" => 1,
        "false" => 0,
        _ => panic!("invalid bool: {}", s),
    }
}

pub fn convert_csv_to_binary(csv_path: &str, bin_path: &str) {
    // Abrimos el CSV
    let file = File::open(csv_path).expect("cannot open csv");
    let mut reader = BufReader::new(file);

    // Preparamos el archivo de salida con BufWriter (mucho más rápido para escritura secuencial)
    let out_file = OpenOptions::new()
        .create(true)
        .write(true)
        .truncate(true)
        .open(bin_path)
        .expect("cannot create output");
    let mut writer = BufWriter::new(out_file);

    // Reutilizamos el mismo buffer de memoria para todas las líneas
    let mut line: String = String::new();
    let mut i: usize = 0usize;

    // Leemos línea por línea sin crear nuevos Strings
    while reader.read_line(&mut line).expect("read line failed") > 0 {
        // Descomentar la siguiente línea si el CSV tiene un header (encabezado)
        // if i == 0 { i += 1; line.clear(); continue; }

        let mut cols: std::str::Split<'_, char> = line.split(',');

        // Extraemos y parseamos las columnas
        let trade_id: u64 = cols.next().unwrap().trim().parse().unwrap();
        
        let price_f: f64 = cols.next().unwrap().trim().parse().unwrap();
        let qty_f: f64 = cols.next().unwrap().trim().parse().unwrap();

        let price: u64 = (price_f * SCALE).round() as u64;
        let qty: u64 = (qty_f * SCALE).round() as u64;

        // quoteQty ignorado
        let _quote_qty: &str = cols.next().unwrap();

        let timestamp_ms: u64 = cols.next().unwrap().trim().parse().unwrap();
        let is_buyer_maker: u8 = parse_bool(cols.next().unwrap());

        // Construimos el struct
        let trade: Trade = Trade {
            trade_id,
            price,
            qty,
            timestamp_ms,
            is_buyer_maker,
            _padding: [0; 7],
        };

        // Escribimos directamente los bytes al archivo binario de forma secuencial
        writer
            .write_all(bytemuck::bytes_of(&trade))
            .expect("failed to write trade to binary");

        // Limpiamos el buffer para la siguiente iteración (clave para evitar re-asignaciones)
        line.clear();
        i += 1;

        if i % 1_000_000 == 0 {
            println!("processed {} rows", i);
        }
    }

    writer.flush().expect("flush failed");
    println!("binary written to {} (Total rows: {})", bin_path, i);
}