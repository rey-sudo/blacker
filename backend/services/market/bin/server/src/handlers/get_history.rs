use axum::{
    extract::State,
    http::StatusCode,
    Json,
};
use serde_json::{Value, json};
use crate::state::AppState;

#[derive(clickhouse::Row, serde::Deserialize)]
struct KvRow {
    value: String,
}

pub async fn handler(
    State(state): State<AppState>,
) -> Result<Json<Value>, (StatusCode, String)> {
    let key: &str = "binance-BTCUSDT"; 

    let row: KvRow = state
        .db
        .query(
            r#"
            SELECT value
            FROM kv_store
            FINAL
            WHERE key = ?
            "#,
        )
        .bind(key)
        .fetch_one::<KvRow>()
        .await
        .map_err(|e: clickhouse::error::Error| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let value: Value = serde_json::from_str(&row.value)
        .map_err(|e: serde_json::Error| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let history: Value = value["timeframes"]["1m"]["series"]["candle-series"]["history"].clone();

    Ok(Json(json!({
        "success": true,
        "message": "ok",
        "data": {
            "history": history
        }
    })))
}