import asyncio
import signal

import structlog
import pulsar

from application.events import Tick
from application.head import AppState, bridge_worker_events, handle_worker_events



log = structlog.get_logger().bind(component="main")


# =========================
# Pulsar setup helpers
# =========================

async def create_pulsar_consumer(client):
    return client.subscribe(
        topic="non-persistent://public/backtesting/input",
        subscription_name="service-backtesting",
        consumer_type=pulsar.ConsumerType.Shared,
    )


def create_pulsar_producer(client):
    return client.create_producer(
        topic="non-persistent://public/backtesting/output",
    )


# =========================
# Main loop
# =========================

async def run():
    log.info("service_starting")

    # --- Pulsar client ---
    client = pulsar.Client("pulsar://127.0.0.1:6650")
    consumer = await create_pulsar_consumer(client)
    producer = create_pulsar_producer(client)

    # --- App state ---
    app_state = AppState(max_workers=128)

    # --- Internal async event bus ---
    async_event_q = asyncio.Queue(maxsize=10_000)

    # --- Background tasks ---
    tasks = [
        asyncio.create_task(
            bridge_worker_events(
                app_state.worker_event_queue,
                async_event_q,
            )
        ),
        asyncio.create_task(
            handle_worker_events(
                app_state,
                producer,
                async_event_q,
            )
        ),
    ]

    log.info("service_ready")

    try:
        while True:
            # Pulsar receive is blocking → executor
            msg = await asyncio.get_running_loop().run_in_executor(
                None,
                consumer.receive,
            )

            context_id = msg.partition_key()
            payload = msg.data()

            worker = app_state.get_or_spawn(context_id)
            
            worker.send(
                Tick(
                    context_id=context_id,
                    payload=payload,
                )
            )

            consumer.acknowledge(msg)

    except asyncio.CancelledError:
        log.info("main_task_cancelled")

    finally:
        log.info("service_shutting_down")

        for t in tasks:
            t.cancel()

        await app_state.shutdown()

        producer.close()
        consumer.close()
        client.close()

        log.info("service_stopped")


# =========================
# Entrypoint
# =========================

def main():
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)

    main_task = loop.create_task(run())

    for sig in (signal.SIGINT, signal.SIGTERM):
        loop.add_signal_handler(
            sig,
            lambda: main_task.cancel(),
        )

    try:
        loop.run_until_complete(main_task)
    finally:
        loop.close()


if __name__ == "__main__":
    main()
