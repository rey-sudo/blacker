use anyhow::Result;
use sqlx::{Pool, Postgres};

/// Shared Postgres connection pool
pub type Db = Pool<Postgres>;

/// Create and initialize the Postgres connection pool
///
/// - Fails fast if the database is unreachable or credentials are invalid
/// - Returns a cloneable, async-safe pool handle
pub async fn connect(database_url: &str) -> Result<Db> {
    let pool = sqlx::postgres::PgPoolOptions::new()
        .max_connections(10)
        .connect(database_url)
        .await?;

    Ok(pool)
}
