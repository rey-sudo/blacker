import asyncio
import base64
import json
import websockets
import pulsar
import structlog
from ws.listener import pulsar_listener

structlog.configure(
    processors=[
        structlog.processors.add_log_level,
        structlog.processors.TimeStamper(fmt="%Y-%m-%d %H:%M:%S"),
        structlog.dev.ConsoleRenderer() 
    ]
)
log = structlog.get_logger()

#=====================================================================================

PULSAR_URL = "pulsar://localhost:6650"
CONSUME_TOPIC = "non-persistent://public/backtest/output"
PRODUCE_TOPIC = "non-persistent://public/backtest/input" 

connected_clients = set()

client = pulsar.Client(PULSAR_URL)
consumer = client.subscribe(CONSUME_TOPIC, "service_backtest_test")
producer = client.create_producer(PRODUCE_TOPIC)

async def ws_handler(websocket):
    client_id = id(websocket)
    client_ip = websocket.remote_address[0]
    connected_clients.add(websocket)
    
    log.info("client_connected", id=client_id, ip=client_ip)
    
    try:
        async for message in websocket:
            log.debug("message_received", id=client_id, payload=message.encode("utf-8"))

            data = json.loads(message)

            context_id = data["context_id"]
            command = data["command"]
            params = data["params"]
            
            input_event = {
                "context_id": context_id,
                "command": command,
                "params": params
            }
            
            final = json.dumps(input_event).encode("utf-8")

            producer.send_async(final, None)            
            
            log.debug("message_sent", id=client_id, payload=final)
            
    except websockets.exceptions.ConnectionClosed:
        pass 
    finally:
        connected_clients.remove(websocket)
        print("Cliente desconectado")
        
def start_consumer(consumer, connected_clients):
    """
    Initializes the Pulsar listener as a background task.
    """
    log.info("initializing_background_tasks", task="pulsar_listener")
    
    task = asyncio.create_task(pulsar_listener(consumer, connected_clients))
    return task

async def start_server(handler, host="0.0.0.0", port=8765):
    """
    Encapsulates the WebSocket server lifecycle with internal error handling.
    """
    try:
        async with websockets.serve(handler, host, port):
            log.info("server_started", url=f"ws://{host}:{port}", status="listening")
            
            # Keeps the context manager open forever
            await asyncio.get_running_loop().create_future()
            
    except OSError as e:
        log.critical("server_binding_failed", host=host, port=port, error=str(e))
    except Exception as e:
        # Catch-all for unexpected lifecycle errors
        log.error("server_runtime_error", error=str(e))
        

async def main():
        start_consumer(consumer, connected_clients)
        await start_server(ws_handler)


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        pass
    finally:
        client.close()