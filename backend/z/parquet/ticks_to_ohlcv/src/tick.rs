use serde::Deserialize;
use serde::de::{self, Deserializer};

#[warn(non_snake_case)]
#[derive(Debug, Deserialize)]
pub struct Tick {
    pub a: i64, // aggregate trade id
    pub p: f64, // price
    pub q: f64, // quantity
    pub f: i64, // first trade id
    pub l: i64, // last trade id
    pub T: i64, // timestamp (microseconds en tu CSV)
    #[serde(deserialize_with = "bool_from_binance")]
    pub m: bool,
    #[serde(deserialize_with = "bool_from_binance")]
    pub M: bool,
}

fn bool_from_binance<'de, D>(deserializer: D) -> Result<bool, D::Error>
where
    D: Deserializer<'de>,
{
    let s: &str = serde::Deserialize::deserialize(deserializer)?;
    match s {
        "True" | "true" | "1" => Ok(true),
        "False" | "false" | "0" => Ok(false),
        _ => Err(de::Error::custom(format!("invalid boolean value: {}", s))),
    }
}
