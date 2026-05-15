use crate::model::Trade;
use memmap2::MmapMut;
use std::{
    fs::{File, OpenOptions},
    io::{BufRead, BufReader},
    mem::size_of,
};

const SCALE: f64 = 1_000_000_00.0;

fn count_lines(path: &str) -> usize {
    let file: File = File::open(path).expect("cannot open csv");
    let reader: BufReader<File> = BufReader::new(file);
    reader.lines().count()
}

fn parse_bool(s: &str) -> u8 {
    match s.trim() {
        "true" => 1,
        "false" => 0,
        _ => panic!("invalid bool: {}", s),
    }
}

pub fn convert_csv_to_binary(csv_path: &str, bin_path: &str) {
    let total_rows: usize = count_lines(csv_path);

    println!("rows: {}", total_rows);

    let out_size: usize = total_rows * size_of::<Trade>();

    let out_file: File = OpenOptions::new()
        .create(true)
        .read(true)
        .write(true)
        .truncate(true)
        .open(bin_path)
        .expect("cannot create output");

    out_file
        .set_len(out_size as u64)
        .expect("cannot set output size");

    let mut mmap: MmapMut = unsafe { MmapMut::map_mut(&out_file).expect("cannot mmap output") };

    let file: File = File::open(csv_path).expect("cannot open csv");
    let reader: BufReader<File> = BufReader::new(file);

    let trades_slice: &mut [Trade] = bytemuck::cast_slice_mut(&mut mmap[..]);

    for (i, line) in reader.lines().enumerate() {
        let line: String = line.expect("bad line");

        let mut cols: std::str::Split<'_, char> = line.split(',');

        let trade_id: u64 = cols.next().unwrap().parse().unwrap();

        let price_f: f64 = cols.next().unwrap().trim().parse().unwrap();
        let qty_f: f64 = cols.next().unwrap().trim().parse().unwrap();

        let price: u64 = (price_f * SCALE).round() as u64;
        let qty: u64 = (qty_f * SCALE).round() as u64;

        // quoteQty ignorado
        let _quote_qty: &str = cols.next().unwrap();

        let timestamp_ms: u64 = cols.next().unwrap().parse().unwrap();

        let is_buyer_maker: u8 = parse_bool(cols.next().unwrap());

        trades_slice[i] = Trade {
            trade_id,
            price,
            qty,
            timestamp_ms,
            is_buyer_maker,
            _padding: [0; 7],
        };

        if i % 1_000_000 == 0 && i > 0 {
            println!("processed {} rows", i);
        }
    }

    mmap.flush().expect("flush failed");

    println!("binary written to {}", bin_path);
}
