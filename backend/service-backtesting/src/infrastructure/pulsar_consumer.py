import asyncio
from application.events import Tick
from application.head import AppState


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



