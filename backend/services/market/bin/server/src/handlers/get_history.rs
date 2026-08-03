use axum::Json;
use serde_json::json;

pub async fn handler() -> Json<serde_json::Value> {
    Json(json!({
        "success": true,
        "message": "ok",
        "data": [
            {
                "time": 1785280680,
                "open": 63604.0,
                "high": 63611.9,
                "low": 63604.0,
                "close": 63611.9,
                "volume": 13.385999999999965,
                "start_ts": 1785280680000 as u64,
                "end_ts": 1785280740000 as u64
            },
            {
                "time": 1785280740,
                "open": 63611.9,
                "high": 63612.0,
                "low": 63600.0,
                "close": 63600.1,
                "volume": 74.86900000000011,
                "start_ts": 1785280740000 as u64,
                "end_ts": 1785280800000 as u64
            }
        ]
    }))
}
