use crate::{
    application::state::AppState,
    common::{api_error::AppError, candle::Candle},
};
use axum::{
    Json,
    extract::{Query, State},
};
use serde::Serialize;
use serde::Deserialize;
use sqlx::QueryBuilder;
use validator::{Validate, ValidationError};

#[derive(Serialize)]
pub struct CandlePage {
    pub data: Vec<Candle>,
    pub cursor: Option<i64>,
}


fn validate_timeframe(tf: &str) -> Result<(), ValidationError> {
    match tf {
        "1m" => Ok(()),
        _ => Err(ValidationError::new("invalid_timeframe")),
    }
}

fn validate_time_range(q: &CandleQuery) -> Result<(), ValidationError> {
    if let (Some(start), Some(end)) = (q.start_timestamp, q.end_timestamp) {
        if start > end {
            return Err(ValidationError::new("invalid_time_range"));
        }
    }
    Ok(())
}

fn validate_time_filters(query: &CandleQuery) -> Result<(), ValidationError> {
    let uses_cursor_pagination: bool = query.before.is_some();
    let uses_absolute_range: bool =
        query.start_timestamp.is_some() || query.end_timestamp.is_some();

    if uses_cursor_pagination && uses_absolute_range {
        return Err(ValidationError::new("conflicting_time_filters"));
    }

    Ok(())
}

/// Represents the query parameters for fetching OHLCV (Open, High, Low, Close, Volume)
/// from the ingestion microservice.
///
/// Automatic validations are applied using `validator`:
/// - Required fields
/// - Numeric ranges
/// - Custom rules for timeframe and time range
#[derive(Debug, Deserialize, Validate)]
#[validate(schema(function = "validate_time_range"))]
#[validate(schema(function = "validate_time_filters"))]
pub struct CandleQuery {
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

    pub before: Option<i64>,
}

/// Handler for fetching OHLCV candles from the database.
///
/// # Parameters
/// - `state`: Shared application state (contains DB connection pool, config, etc.)
/// - `params`: Query parameters validated as `CandleQuery`
///
/// # Returns
/// - `Json<Vec<Candle>>` on success
/// - `AppError` on validation or internal errors
pub async fn handler(
    State(state): State<AppState>,
    Query(params): Query<CandleQuery>,
) ->  Result<Json<CandlePage>, AppError>  {
    // Validate the incoming query parameters using the `validator` crate.
    if let Err(err) = params.validate() {
        tracing::warn!("Query validation error: {:?}", err);
        return Err(AppError::validation(err));
    }

    // Create a new SQLx QueryBuilder for PostgreSQL
    // QueryBuilder allows building dynamic SQL queries safely with bound parameters.
    let mut builder: QueryBuilder<'_, sqlx::Postgres> = QueryBuilder::new(
        r#"
        SELECT
            symbol,
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

    // Bind symbol parameter
    builder.push_bind(&params.symbol);

    // Optional start timestamp filter
    if let Some(start) = params.start_timestamp {
        builder.push(" AND open_time >= ");
        builder.push_bind(start);
    }

    // Optional end timestamp filter
    if let Some(end) = params.end_timestamp {
        builder.push(" AND open_time <= ");
        builder.push_bind(end);
    }

    if let Some(before) = params.before {
        builder.push(" AND open_time < ");
        builder.push_bind(before);
    }

    // Sort descending by open_time
    builder.push(" ORDER BY open_time DESC ");

    // Limit number of results
    let limit: i64 = params.limit.unwrap_or(500);
    builder.push(" LIMIT ");
    builder.push_bind(limit);

    let rows: Vec<Candle> = builder
        .build_query_as()
        .fetch_all(state.db.pool())
        .await
        .map_err(|_| AppError::internal("database error"))?;

    // UI Chart ordering ASC
    let mut rows: Vec<Candle> = rows;
    rows.reverse();

    // cursor = open_time oldest candle
    let cursor = rows.first().map(|c| c.open_time);

    Ok(Json(CandlePage {
        data: rows,
        cursor,
    }))
}
