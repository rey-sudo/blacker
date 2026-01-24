use crate::{application::state::AppState, common::error_api::AppError};
use axum::{
    Json,
    extract::{Query, State}
};
use serde::Deserialize;
use serde::Serialize;
use sqlx::QueryBuilder;
use validator::{Validate, ValidationError};

fn validate_timeframe(tf: &str) -> Result<(), ValidationError> {
    match tf {
        "1m" => Ok(()),
        _ => Err(ValidationError::new("invalid_timeframe")),
    }
}

fn validate_time_range(q: &OhlcvQuery) -> Result<(), ValidationError> {
    if let (Some(start), Some(end)) = (q.start_timestamp, q.end_timestamp) {
        if start > end {
            return Err(ValidationError::new("invalid_time_range"));
        }
    }
    Ok(())
}

#[derive(Debug, Deserialize, Validate)]
#[validate(schema(function = "validate_time_range"))]
pub struct OhlcvQuery {
    #[validate(length(min = 1, max = 20))]
    pub symbol: String,

    #[validate(custom(function = "validate_timeframe"))]
    pub timeframe: String,

    #[validate(range(min = 1, max = 1000))]
    pub limit: Option<i64>,

    #[validate(range(min = 0))]
    pub start_timestamp: Option<i64>,

    #[validate(range(min = 0))]
    pub end_timestamp: Option<i64>,
}

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct Ohlcv {
    pub open_time: i64,
    pub close_time: i64,
    pub open: f64,
    pub high: f64,
    pub low: f64,
    pub close: f64,
    pub volume: f64,
}

pub async fn handler(
    State(state): State<AppState>,
    Query(params): Query<OhlcvQuery>,
) -> Result<Json<Vec<Ohlcv>>, AppError> {
    // -------- Validaciones --------

    if let Err(err) = params.validate() {
        tracing::warn!("Query validation error: {:?}", err);
        return Err(AppError::validation(err));
    }

    // -------- Query dinámica --------

    let mut qb = QueryBuilder::new(
        r#"
        SELECT
            open_time,
            close_time,
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
        .map_err(|_| AppError::internal("database error"))?;

    // -------- Reordenar ASC --------
    let mut rows: Vec<Ohlcv> = rows;
    rows.reverse();

    Ok(Json(rows))
}
