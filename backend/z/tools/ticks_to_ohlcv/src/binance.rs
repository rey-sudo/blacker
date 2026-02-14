use csv::{ReaderBuilder, WriterBuilder};
use serde::{Deserialize, Deserializer, Serialize};
use std::error::Error;
use crate::check::validate_ticks_sorted;

#[derive(Debug, Deserialize)]
struct Trade {
    _agg_id: u64,
    price: f64,
    quantity: f64,
    _f_id: u64,
    _l_id: u64,
    timestamp: u64,
    #[serde(deserialize_with = "bool_from_str")]
    _is_buyer_maker: bool,
    #[serde(deserialize_with = "bool_from_str")]
    _is_best_match: bool,
}

#[derive(Debug, Serialize, Clone)]
struct Ohlcv {
    timestamp: u64,
    open: f64,
    high: f64,
    low: f64,
    close: f64,
    volume: f64,
}

fn bool_from_str<'de, D>(deserializer: D) -> Result<bool, D::Error>
where
    D: Deserializer<'de>,
{
    let s = String::deserialize(deserializer)?;
    match s.to_lowercase().as_str() {
        "true" => Ok(true),
        "false" => Ok(false),
        _ => Err(serde::de::Error::custom("Booleano inválido")),
    }
}

pub fn run(
    csv_path: &str,
    output_path: &str,
    timeframe_ms: u64,
    fill_gaps: bool,
) -> Result<(), Box<dyn Error>> {
    if timeframe_ms == 0 {
        return Err("timeframe_ms no puede ser 0".into());
    }

    validate_ticks_sorted(csv_path)?;

    let mut rdr = ReaderBuilder::new()
        .has_headers(false)
        .from_path(csv_path)?;

    let mut wtr = WriterBuilder::new()
        .has_headers(true)
        .from_path(output_path)?;

    let mut current_bucket: Option<u64> = None;
    let mut current_candle: Option<Ohlcv> = None;

    println!("Procesando trades en modo streaming...");

    for result in rdr.deserialize() {
        let trade: Trade = match result {
            Ok(t) => t,
            Err(e) => {
                eprintln!("Error leyendo trade: {}. Saltando...", e);
                continue;
            }
        };

        let timestamp_ms = trade.timestamp / 1_000;
        let bucket = (timestamp_ms / timeframe_ms) * timeframe_ms;

        match current_bucket {
            None => {
                // Primera vela
                current_bucket = Some(bucket);
                current_candle = Some(Ohlcv {
                    timestamp: bucket,
                    open: trade.price,
                    high: trade.price,
                    low: trade.price,
                    close: trade.price,
                    volume: trade.quantity,
                });
            }

            Some(cb) if bucket == cb => {
                // Mismo bucket → actualizar
                let candle = current_candle.as_mut().unwrap();

                if trade.price > candle.high {
                    candle.high = trade.price;
                }
                if trade.price < candle.low {
                    candle.low = trade.price;
                }

                candle.close = trade.price;
                candle.volume += trade.quantity;
            }

            Some(cb) if bucket > cb => {
                let finished = current_candle.take().unwrap();
                let prev_close = finished.close;

                wtr.serialize(&finished)?;

                if fill_gaps {
                    let mut gap_bucket = cb + timeframe_ms;

                    while gap_bucket < bucket {
                        let gap_candle = Ohlcv {
                            timestamp: gap_bucket,
                            open: prev_close,
                            high: prev_close,
                            low: prev_close,
                            close: prev_close,
                            volume: 0.0,
                        };

                        wtr.serialize(gap_candle)?;
                        gap_bucket += timeframe_ms;
                    }
                }

                current_bucket = Some(bucket);
                current_candle = Some(Ohlcv {
                    timestamp: bucket,
                    open: trade.price,
                    high: trade.price,
                    low: trade.price,
                    close: trade.price,
                    volume: trade.quantity,
                });
            }

            _ => {
                // Si llega aquí → datos desordenados
                return Err("Los trades no están ordenados por timestamp ascendente".into());
            }
        }
    }

    // Escribir última vela
    if let Some(mut last) = current_candle {
        wtr.serialize(last)?;
    }

    wtr.flush()?;

    println!("Proceso finalizado correctamente.");

    Ok(())
}
