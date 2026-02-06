import asyncio
import json
import pulsar
import structlog
from application.events import Command
from application.head import AppState, bridge_worker_events, handle_worker_events

log = structlog.get_logger().bind(component="head")

async def run():
    log.info("pulsar_connection")
    client = pulsar.Client("pulsar://127.0.0.1:6650")
    
    log.info("creating_consumer")
    consumer = client.subscribe(
        topic="non-persistent://public/backtesting/input",
        subscription_name="service-backtesting",
        consumer_type=pulsar.ConsumerType.KeyShared,
    )
    
    log.info("creating_producer")
    producer = client.create_producer(
        topic="non-persistent://public/backtesting/output",
    )

    app_state = AppState(max_workers=128)
    shared_queue = asyncio.Queue(maxsize=10_000)
    
    log.info("creating_tasks")
    tasks = [
        asyncio.create_task(
            bridge_worker_events(
                app_state.worker_event_queue,
                shared_queue,
            )
        ),
        asyncio.create_task(
            handle_worker_events(
                app_state,
                producer,
                shared_queue,
            )
        ),
    ]

    log.info("service_ready")

    try:
        # Main service loop.
        #
        # Continuously consumes messages from the Pulsar input topic and routes
        # them to the appropriate worker based on the partition key (context_id).
        #
        while True:
            # Pulsar's `receive()` call is blocking and must not run
            # directly on the asyncio event loop.
            #
            # It is therefore executed inside the default thread pool executor,
            # allowing the event loop to remain responsive.
            msg = await asyncio.get_running_loop().run_in_executor(
                None,
                consumer.receive,
            )
            
            # Extract the logical shard key used for deterministic routing.
            # All ticks with the same context_id will be handled by the same worker.
            context_id = msg.partition_key()
            payload = msg.data()
            payload_str = payload.decode("utf-8")
            payload_dict = json.loads(payload_str)

            command = payload_dict.get("command")
            params = payload_dict.get("params")
            
            log.debug(
                "pulsar_message_received",
                type=command,
                context_id=context_id,
                params=params,
            )
            
            # Lazily retrieve or spawn a worker for this context.
            # Worker ownership is maintained by the Head (AppState).
            worker = app_state.get_or_spawn(context_id)

            # Forward the tick to the worker process.
            # This is a non-blocking IPC enqueue operation.
            worker.send(
                Command(
                    type=command,
                    context_id=context_id,
                    params=params,
                )
            )

            # Acknowledge the message only after it has been successfully
            # routed to a worker, ensuring at-least-once delivery semantics.
            consumer.acknowledge(msg)

    except asyncio.CancelledError:
        # Triggered when the service receives a shutdown signal.
        # This is the normal and expected termination path.
        log.info("main_task_cancelled")

    finally:
        # Begin graceful shutdown sequence.
        # This block always executes, regardless of how the loop exits.
        log.info("service_shutting_down")

        # Cancel background asyncio tasks (event bridge and handlers).
        for t in tasks:
            t.cancel()

        # Gracefully stop all worker processes and release resources.
        await app_state.shutdown()

        # Close external resources in the correct order.
        producer.close()
        consumer.close()
        client.close()

        log.info("service_stopped")
