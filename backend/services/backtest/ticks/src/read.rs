use std::{
    fs::{File}
};
use memmap2::{Mmap};
use crate::model::Trade;


pub fn read_binary(path: &str) {
    let file: File = File::open(path).expect("cannot open binary");

    let mmap: Mmap = unsafe {
        Mmap::map(&file)
            .expect("cannot mmap binary")
    };

    let trades: &[Trade] = bytemuck::cast_slice(&mmap);

    println!("loaded {} trades", trades.len());

    for t in trades.iter() {
        println!("{:?}", t);
    }
}
