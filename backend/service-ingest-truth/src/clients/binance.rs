/*
 * BLACKER
 * Copyright (C) 2026  Juan José Caballero Rey
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

use anyhow::{Result, anyhow};
use chrono::{DateTime, TimeZone, Utc};
use serde_json::Value;

#[derive(Debug, Clone)]
pub struct Ohlcv {
    pub symbol: String,
    pub open_time: DateTime<Utc>,
    pub close_time: DateTime<Utc>,
    pub open: f64,
    pub high: f64,
    pub low: f64,
    pub close: f64,
    pub volume: f64,
}

/// Binance REST client for historical market data.
///
/// Responsibilities:
/// - Fetch closed OHLCV candles
/// - Normalize Binance-specific formats
/// - Never return partial candles
#[derive(Clone)]
pub struct Binance {
    http: reqwest::Client,
    base_url: String,
}

impl Binance {
    pub fn new() -> Self {
        Self {
            http: reqwest::Client::new(),
            base_url: "https://api.binance.com".to_string(),
        }
    }

    /// Fetch 1m klines for a symbol.
    ///
    /// - Returns fully closed candles only
    /// - `start_time` and `end_time` are UTC millis
    pub async fn fetch_ohlcv_1m(
        &self,
        symbol: &str,
        start_time: Option<i64>,
        end_time: Option<i64>,
        limit: u16,
    ) -> Result<Vec<Ohlcv>> {
        let mut req = self
            .http
            .get(format!("{}/api/v3/klines", self.base_url))
            .query(&[
                ("symbol", symbol),
                ("interval", "1m"),
                ("limit", &limit.to_string()),
            ]);

        if let Some(start) = start_time {
            req = req.query(&[("startTime", start.to_string())]);
        }

        if let Some(end) = end_time {
            req = req.query(&[("endTime", end.to_string())]);
        }

        let resp: reqwest::Response = req.send().await?.error_for_status()?;
        let data: Vec<Vec<Value>> = resp.json().await?;

        let mut candles = Vec::with_capacity(data.len());

        for k in data {
            if k.len() < 7 {
                return Err(anyhow!("Invalid kline payload from Binance"));
            }

            let open_time_ms: i64 = k[0].as_i64().unwrap();
            let close_time_ms: i64 = k[6].as_i64().unwrap();

            let open_time: DateTime<Utc> = Utc
                .timestamp_millis_opt(open_time_ms)
                .single()
                .ok_or_else(|| anyhow!("Invalid open_time millis: {}", open_time_ms))?;

            let close_time: DateTime<Utc> = Utc
                .timestamp_millis_opt(close_time_ms)
                .single()
                .ok_or_else(|| anyhow!("Invalid close_time millis: {}", close_time_ms))?;

            candles.push(Ohlcv {
                symbol: symbol.to_string(),
                open_time,
                close_time,
                open: k[1].as_str().unwrap().parse()?,
                high: k[2].as_str().unwrap().parse()?,
                low: k[3].as_str().unwrap().parse()?,
                close: k[4].as_str().unwrap().parse()?,
                volume: k[5].as_str().unwrap().parse()?,
            });
        }

        Ok(candles)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::Utc;
    use tracing::info;

    #[tokio::test]
    async fn fetch_ohlcv_1m_from_binance() {
        tracing_subscriber::fmt::init();

        let client: Binance = Binance::new();

        let candles: Vec<Ohlcv> = client
            .fetch_ohlcv_1m("BTCUSDT", None, None, 5)
            .await
            .expect("failed to fetch klines");

        assert!(!candles.is_empty());

        let c: &Ohlcv = &candles[0];

        info!("{:?}", c);

        // Basic structural assertions
        assert_eq!(c.symbol, "BTCUSDT");
        assert!(c.open > 0.0);
        assert!(c.high >= c.low);
        assert!(c.volume >= 0.0);

        // Time sanity
        assert!(c.close_time > c.open_time);
        assert!(c.open_time < Utc::now());
    }
}
