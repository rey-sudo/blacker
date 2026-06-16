use anyhow::{Context, Result};
use redis::streams::StreamReadReply;
use std::{sync::Arc, time::Duration};
use tick::stream::start_tick_streaming;
use tokio::{sync::Mutex, task::JoinHandle};
use tokio_util::sync::CancellationToken;
use tracing::{error, info};

/// Redis stream used to receive backtesting commands.
const STREAM_NAME: &str = "backtester:commands";
/// Consumer group responsible for processing backtesting commands.
const GROUP_NAME: &str = "backtester-tick-group";
/// Unique consumer name within the consumer group.
const CONSUMER_NAME: &str = "worker-1";

// Tracks the currently running backtest task and its cancellation token.
struct BacktestState {
    token: Option<CancellationToken>,
    handle: Option<JoinHandle<()>>,
}

//----------------------------------------------------------------------------------------------------------------------
// MAIN
//----------------------------------------------------------------------------------------------------------------------

#[tokio::main]
async fn main() -> Result<()> {
    tracing_subscriber::fmt::init();

    // 1. Redis client: Create a Redis client using the internal network address.
    let redis_client: redis::Client =
        redis::Client::open("redis://redis-local:6379").expect("URL de Redis inválida");

    // 2. Establish a multiplexed async connection shared across Redis commands.
    let mut conn: redis::aio::MultiplexedConnection = redis_client
        .get_multiplexed_async_connection()
        .await
        .context("Failed to connect to Redis at redis://redis-local:6379")?;

    // 3. Create the consumer group if it does not already exist.
    let _: Result<String, _> = redis::cmd("XGROUP")
        .arg("CREATE")
        .arg(STREAM_NAME)
        .arg(GROUP_NAME)
        .arg("0") // Initial ID
        .arg("MKSTREAM") // Create stream if it doesn't exist.
        .query_async(&mut conn)
        .await;

    // 4. Shared state used to control the currently running backtest.
    let state: Arc<Mutex<BacktestState>> = Arc::new(Mutex::new(BacktestState {
        token: None,
        handle: None,
    }));

    info!("Listening stream {}", STREAM_NAME);

    // 5. Main loop: Continuously poll Redis for new commands.
    loop {
        // Read messages as a member of the Consumer Group.
        let reply: StreamReadReply = redis::cmd("XREADGROUP")
            .arg("GROUP") // Consumer Group mode.
            .arg(GROUP_NAME)
            .arg(CONSUMER_NAME)
            .arg("COUNT") // Maximum number of messages per read.
            .arg(10)
            .arg("STREAMS")
            .arg(STREAM_NAME)
            .arg(">") // Only new, never-delivered messages.
            .query_async(&mut conn)
            .await?;

        if reply.keys.is_empty() {
            tokio::time::sleep(Duration::from_millis(500)).await;
            continue;
        }

        // Process each command received from the Consumer Group.
        for stream in reply.keys {
            for message in stream.ids {
                let command: Option<String> = message.get("command");
                let payload: Option<String> = message.get("payload");

                match command.as_deref() {
                    Some("START_BACKTESTING") => {
                        let payload: String = payload.unwrap_or_default();

                        // Acquire exclusive access to the active backtest state.
                        let mut state: tokio::sync::MutexGuard<'_, BacktestState> =
                            state.lock().await;

                        // Ensure only one backtest is active at a time.
                        if let Some(token) = state.token.take() {
                            info!("Cancelling previous backtest");
                            token.cancel();
                        }

                        // Abort previous task handle.
                        if let Some(handle) = state.handle.take() {
                            info!("Aborting previous handle");
                            handle.abort();
                        }

                        // Create a new cancellation token for this execution.
                        let token: CancellationToken = CancellationToken::new();
                        let token_clone: CancellationToken = token.clone();

                        let redis_clone: redis::Client = redis_client.clone();

                        // Run the backtest in a detached task so the Redis consumer
                        // can continue receiving commands.
                        let handle: JoinHandle<()> = tokio::spawn(async move {
                            if let Err(err) =
                                start_tick_streaming(payload, token_clone, redis_clone).await
                            {
                                error!("Backtest failed: {:?}", err);
                            }
                        });

                        state.token = Some(token);
                        state.handle = Some(handle);
                    }

                    Some("STOP_BACKTESTING") => {
                        // Acquire exclusive access to the active backtest state.
                        let mut state: tokio::sync::MutexGuard<'_, BacktestState> =
                            state.lock().await;

                        // Signal the active backtest to stop gracefully.
                        if let Some(token) = state.token.take() {
                            info!("Stopping backtest");
                            token.cancel();
                        }

                        state.handle.take();
                    }

                    Some(cmd) => {
                        error!("Unknown command: {}", cmd);
                    }

                    None => {
                        error!("Message without command field");
                    }
                }

                // Acknowledge successful command delivery to the Consumer Group.
                redis::cmd("XACK")
                    .arg(STREAM_NAME)
                    .arg(GROUP_NAME)
                    .arg(&message.id)
                    .query_async::<()>(&mut conn)
                    .await?;
            }
        }
    }
}
