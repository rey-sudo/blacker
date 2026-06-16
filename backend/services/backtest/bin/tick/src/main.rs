use std::time::Duration;

use anyhow::Result;
use redis::{
    AsyncCommands,
    streams::{StreamReadOptions, StreamReadReply},
};
use tokio::task;
use tracing::{error, info};

const STREAM_NAME: &str = "backtester:commands";

#[tokio::main]
async fn main() -> Result<()> {
    tracing_subscriber::fmt::init();

    let client: redis::Client =
        redis::Client::open("redis://redis-local:6379").expect("URL de Redis inválida");

    let mut conn: redis::aio::MultiplexedConnection =
        client.get_multiplexed_async_connection().await?;

    let _: Result<String, _> = redis::cmd("XGROUP")
        .arg("CREATE")
        .arg(STREAM_NAME)
        .arg("backtester-tick-group")
        .arg("0")
        .arg("MKSTREAM")
        .query_async(&mut conn)
        .await;

    info!("Listening stream {}", STREAM_NAME);

    loop {
        let reply: StreamReadReply = redis::cmd("XREADGROUP")
            .arg("GROUP")
            .arg("backtester-tick-group")
            .arg("worker-1")
            .arg("COUNT")
            .arg(10)
            .arg("STREAMS")
            .arg(STREAM_NAME)
            .arg(">")
            .query_async(&mut conn)
            .await?;

        if reply.keys.is_empty() {
            tokio::time::sleep(Duration::from_millis(500)).await;
            continue;
        }

        for stream in reply.keys {
            for message in stream.ids {
                let command: Option<String> = message.get("command");
                let payload: Option<String> = message.get("payload");

                let result = match command.as_deref() {
                    Some("START_BACKTESTING") => {
                        start_backtesting(payload.unwrap_or_default()).await
                    }
                    _ => Ok(()),
                };

                if result.is_ok() {
                    redis::cmd("XACK")
                        .arg(STREAM_NAME)
                        .arg("backtester-tick-group")
                        .arg(&message.id)
                        .query_async::<()>(&mut conn)
                        .await?;
                }
            }
        }
    }
}

async fn start_backtesting(payload: String) -> Result<()> {
    info!("Starting backtest: {}", payload);

    Ok(())
}
