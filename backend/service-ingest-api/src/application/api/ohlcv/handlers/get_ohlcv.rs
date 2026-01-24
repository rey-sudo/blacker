use axum::{
    extract::{Query, State},
    http::StatusCode,
    Json,
};
use sqlx::QueryBuilder;

use serde::Deserialize;
use serde::Serialize;

use crate::application::state::AppState;

#[derive(Debug, Deserialize)]
pub struct OhlcvQuery {
    pub symbol: String,
    pub timeframe: String,
    pub limit: i64,
    pub start_timestamp: Option<i64>,
    pub end_timestamp: Option<i64>,
}

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct Ohlcv {
    pub open_time: i64,
    pub open: f64,
    pub high: f64,
    pub low: f64,
    pub close: f64,
    pub volume: f64,
}


pub async fn handler(
    State(state): State<AppState>,
    Query(params): Query<OhlcvQuery>,
) -> Result<Json<Vec<Ohlcv>>, StatusCode> {
    // -------- Validaciones --------

    if params.timeframe != "1m" {
        return Err(StatusCode::BAD_REQUEST);
    }

    if params.limit <= 0 || params.limit > 1000 {
        return Err(StatusCode::BAD_REQUEST);
    }

    // -------- Query dinámica --------

    let mut qb = QueryBuilder::new(
        r#"
        SELECT
            open_time,
            open,
            high,
            low,
            close,
            volume
        FROM ohlcv_1m
        WHERE symbol = 
        "#,
    );

    qb.push_bind(&params.symbol);

    if let Some(start) = params.start_timestamp {
        qb.push(" AND open_time >= ");
        qb.push_bind(start);
    }

    if let Some(end) = params.end_timestamp {
        qb.push(" AND open_time <= ");
        qb.push_bind(end);
    }

    qb.push(" ORDER BY open_time DESC ");
    qb.push(" LIMIT ");
    qb.push_bind(params.limit);

    let rows: Vec<Ohlcv> = qb
        .build_query_as()
        .fetch_all(state.db.pool())
        .await
        .map_err(|e| {
            tracing::error!("DB error: {:?}", e);
            StatusCode::INTERNAL_SERVER_ERROR
        })?;

    // -------- Reordenar ASC --------
    let mut rows = rows;
    rows.reverse();

    Ok(Json(rows))
}
