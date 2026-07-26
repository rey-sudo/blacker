use anyhow::Result;
use clickhouse::Client;
use publisher::publisher::publisher_loop;

#[tokio::main]
async fn main() -> Result<()> {
    tracing_subscriber::fmt::init();

    let db: Client = Client::default()
        .with_url("http://localhost:8123")
        .with_database("app")
        .with_user("app")
        .with_password("app123");

    db.query("SELECT 1").execute().await?;

    publisher_loop(&db).await?;

    Ok(())
}
