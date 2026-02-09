use serde::Deserialize;

#[warn(non_snake_case)]
#[derive(Debug, Deserialize)]
pub struct Tick {
    pub a: i64,      // aggregate trade id
    pub p: f64,      // price
    pub q: f64,      // quantity
    pub f: i64,      // first trade id
    pub l: i64,      // last trade id
    pub T: i64,      // timestamp (microseconds en tu CSV)
    pub m: bool,
    pub M: bool,
}
