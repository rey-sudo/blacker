use service_backtest::application;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    
    application::run().await?;

    Ok(())
}
