import asyncio
import signal
from application.head import AppState, poll_worker_events
from application.events import Tick
from infrastructure.logging import setup_logging
import structlog

class DummyProducer:
    """
    Placeholder del producer de Pulsar.
    Reemplazar por infra/pulsar_producer.py
    """
    def send(self, key: str, value: bytes):
        # En prod: producer.send(value, partition_key=key)
        pass


async def pulsar_consumer_loop(app_state: AppState):
    """
    Simulación del consumer Pulsar.
    En prod: este loop recibe mensajes reales del topic input.
    """
    i = 0
    while True:
        context_id = f"ctx-{i % 4}"
        worker = app_state.get_or_spawn(context_id)
        worker.send(Tick(context_id, b"tick"))
        i += 1
        await asyncio.sleep(0.01)




async def main():
    setup_logging()

    log = structlog.get_logger().bind(component="head")

    log.info(f"Starting backtesting microservice")

    app_state = AppState(max_workers=128)
    
    producer = DummyProducer()

    # Task que drena eventos worker -> head -> Pulsar output
    asyncio.create_task(poll_worker_events(app_state, producer))

    # Task que consume Pulsar input (simulado)
    consumer_task = asyncio.create_task(
        pulsar_consumer_loop(app_state)
    )

    # Shutdown limpio por SIGTERM / SIGINT
    loop = asyncio.get_running_loop()
    stop_event = asyncio.Event()

    def _stop():
        stop_event.set()

    for sig in (signal.SIGINT, signal.SIGTERM):
        loop.add_signal_handler(sig, _stop)

    await stop_event.wait()

    consumer_task.cancel()
    
    app_state.shutdown_all()
    await asyncio.sleep(0.2)


if __name__ == "__main__":
    asyncio.run(main())
