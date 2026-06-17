use anyhow::{Context, Result};
use pulsar::{Pulsar, TokioExecutor};
use redis::streams::StreamReadReply;
use redis::{AsyncCommands, aio::MultiplexedConnection};
use std::{sync::Arc, time::Duration};
use tick::stream::start_tick_streaming;
use tokio::{sync::Mutex, task::JoinHandle};
use tokio_util::sync::CancellationToken;
use tracing::{error, info};

const HEARTBEAT_KEY: &str = "backtester:tick:alive";
const HEARTBEAT_TTL: u64 = 5;
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
// AUXILIAR
//----------------------------------------------------------------------------------------------------------------------

pub fn spawn_redis_heartbeat(mut conn: MultiplexedConnection) -> JoinHandle<()> {
    tokio::spawn(async move {
        let mut interval: tokio::time::Interval = tokio::time::interval(Duration::from_secs(2));

        loop {
            interval.tick().await;

            let _: () = conn
                .set_ex(HEARTBEAT_KEY, "1", HEARTBEAT_TTL)
                .await
                .unwrap_or(());
        }
    })
}

async fn ensure_redis_consumer_group(
    conn: &mut MultiplexedConnection,
    stream: &str,
    group: &str,
) -> Result<()> {
    let result: redis::RedisResult<String> = redis::cmd("XGROUP")
        .arg("CREATE")
        .arg(stream)
        .arg(group)
        .arg("0")
        .arg("MKSTREAM")
        .query_async(conn)
        .await;

    match result {
        Ok(_) => Ok(()),
        Err(e) => {
            // "BUSYGROUP" significa que ya existe, no es un error de ejecución
            if e.to_string().contains("BUSYGROUP") {
                Ok(())
            } else {
                Err(e.into())
            }
        }
    }
}

//----------------------------------------------------------------------------------------------------------------------
// MAIN
//----------------------------------------------------------------------------------------------------------------------

#[tokio::main]
async fn main() -> Result<()> {
    tracing_subscriber::fmt::init();

    // 1. Redis client: create a Redis client using the internal network address.
    let redis_client: redis::Client =
        redis::Client::open("redis://localhost:6380").expect("URL de Redis inválida");

    // 2. Redis connection: Establish a multiplexed async connection shared across Redis commands.
    let mut redis_conn: MultiplexedConnection = redis_client
        .get_multiplexed_async_connection()
        .await
        .context("Failed to connect to Redis at redis://localhost:6380")?;

    // 3. Redis group: Create the consumer group if it does not already exist.
    ensure_redis_consumer_group(&mut redis_conn, STREAM_NAME, GROUP_NAME)
        .await
        .context("Error fatal al preparar el bus de eventos")?;

    // 4. Pulsar client: Create the pulsar client for the producer.
    let pulsar_client: Pulsar<TokioExecutor> =
        Pulsar::builder("pulsar://localhost:6650", TokioExecutor)
            .with_outbound_channel_size(10_000)
            .build()
            .await?;

    // 5. Heartbeat : Publish the service availability.
    let _heartbeat_handle: JoinHandle<()> = spawn_redis_heartbeat(redis_conn.clone());

    // 6. State : Shared state used to control the currently running backtest.
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
            .query_async(&mut redis_conn)
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

                        let pulsar_clone: Pulsar<TokioExecutor> = pulsar_client.clone();

                        // Run the backtest in a detached task so the Redis consumer
                        // can continue receiving commands.
                        let handle: JoinHandle<()> = tokio::spawn(async move {
                            if let Err(err) =
                                start_tick_streaming(payload, token_clone, pulsar_clone).await
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
                    .query_async::<()>(&mut redis_conn)
                    .await?;
            }
        }
    }
}
