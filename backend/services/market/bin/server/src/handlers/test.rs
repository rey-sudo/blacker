use axum::{Json};
use serde_json::json;

pub async fn test_handler() -> Json<serde_json::Value> {
    Json(json!({
        "status": "ok",
        "message": "TEST OK"
    }))
}
