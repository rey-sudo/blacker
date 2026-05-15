use ticks::{read::read_binary, write::convert_csv_to_binary};

fn main() {
    let csv_path: &str = "./input/input.csv";
    let bin_path: &str = "./output/ticks.bin";

    convert_csv_to_binary(csv_path, bin_path);

    //read_binary(bin_path)
}