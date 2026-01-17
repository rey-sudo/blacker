use anyhow::{Result, anyhow};
use crate::infrastructure::database::Database;

///Check necessary database properties.
pub async fn checklist(db: &Database) -> Result<()> {
    let table_1: &str = "ohlcv_1m";

    let table_exists: (bool,) = sqlx::query_as(
        "SELECT EXISTS (
            SELECT 1
            FROM information_schema.tables
            WHERE table_schema = 'public'
              AND table_name = $1
        )"
    )
    .bind(table_1)
    .fetch_one(db.pool())
    .await?;

    if !table_exists.0 {
        return Err(anyhow!("Table '{}' does not exist in the database", table_1));
    }

    Ok(())
}
