pub mod bootstrap;

use anyhow::Result;
use sqlx::{PgPool, postgres::PgPoolOptions};
use std::time::Duration;
use tracing::info;

/// Encapsulates a PostgreSQL connection pool.
/// Internally this is an async, thread-safe connection pool that can be shared across tasks.
#[derive(Clone)]
pub struct Database {
    pool: PgPool,
}

impl Database {
    /// Creates a new Database instance asynchronously.
    ///
    /// # Arguments
    ///
    /// * `database_url` - PostgreSQL connection string
    ///
    /// # Example
    ///
    /// ```rust
    /// let db = Database::new("postgres://user:pass@localhost/db").await?;
    /// let pool = db.pool();
    /// ```
    pub async fn new(database_url: &str) -> Result<Self> {
        let pool: sqlx::Pool<sqlx::Postgres> = PgPoolOptions::new()
            .max_connections(10)
            .acquire_timeout(Duration::from_secs(5))
            .connect(database_url)
            .await?;

        info!("Connected to Postgres");

        Ok(Self { pool })
    }

    /// Returns a reference to the internal connection pool
    pub fn pool(&self) -> &PgPool {
        &self.pool
    }
}
