use service_backtest::{application, infrastructure::bootstrap};

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    bootstrap::run()?;

    application::run().await?;

    Ok(())
}
