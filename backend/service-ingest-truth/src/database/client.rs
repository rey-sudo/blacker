use anyhow::Result;
use sqlx::{PgPool, postgres::PgPoolOptions};
use std::time::Duration;

/// Shared database handle used across the service.
/// Internally this is an async, thread-safe connection pool.
pub type Db = PgPool;

/// Create a PostgreSQL connection pool.
///
/// - Uses sqlx async pooling
/// - Fails fast if the database is unreachable
/// - Safe to clone and share across tasks
pub async fn connect(database_url: &str) -> Result<Db> {
    let pool: PgPool = PgPoolOptions::new()
        .max_connections(10)
        .acquire_timeout(Duration::from_secs(5))
        .connect(database_url)
        .await?;

    Ok(pool)
}
