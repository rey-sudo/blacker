use anyhow::Result;
use async_channel;
use listener::{
    models::{Tick, TickBatch},
    tasks::listen_ws_trades,
};
use tokio::task::JoinSet;
use rustls::crypto::ring;


#[tokio::main]
async fn main() -> Result<()> {
    ring::default_provider()
        .install_default()
        .expect("Failed to install rustls crypto provider");


    let (tick_tx, tick_rx) = async_channel::bounded::<Tick>(100_000);

    let (batch_tx, batch_rx) = async_channel::bounded::<TickBatch>(200);

    let mut tasks: JoinSet<Result<(), _>> = JoinSet::new();

    tasks.spawn(listen_ws_trades::run(tick_tx));

    while let Some(result) = tasks.join_next().await {
        match result {
            Ok(Ok(())) => {}

            Ok(Err(err)) => {
                eprintln!("Task error: {err:?}");
            }

            Err(err) => {
                eprintln!("Join error: {err:?}");
            }
        }
    }

    Ok(())
}
