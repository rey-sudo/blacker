import asyncio

async def safe_send(ws, data):
    """Envío seguro para evitar que un error de un cliente rompa el loop principal"""
    try:
        await ws.send(data)
    except Exception:
        pass # La limpieza se hace en el ws_handler (finally)


async def pulsar_listener(consumer, connected_clients):
    loop = asyncio.get_running_loop()
    while True:
        # Recibir mensaje de forma no bloqueante para el loop
        msg = await loop.run_in_executor(None, consumer.receive)
        data = msg.data().decode("utf-8")
        
        # Acknowledge también en un executor para evitar micro-bloqueos
        loop.run_in_executor(None, consumer.acknowledge, msg)

        if connected_clients:
            # Creamos tareas individuales para que un cliente lento no frene al resto
            tasks = [asyncio.create_task(safe_send(ws, data)) for ws in connected_clients]
            await asyncio.wait(tasks)
