import asyncio
import json

async def safe_send(ws, data):
    try:
        await ws.send(json.dumps(data))
    except Exception as e:
        print("WebSocket send error:", e)


async def pulsar_listener(consumer, connected_clients):
    loop = asyncio.get_running_loop()

    while True:

        msg = await loop.run_in_executor(None, consumer.receive)
        print("📥 Message received from Pulsar")
        
        data = None

        try:
            event = json.loads(msg.data())
            
            #print(event)
            
            payload_bytes = bytes(event["payload"])

            state = json.loads(payload_bytes.decode("utf-8"))

            print(state)
            
            data = state
            
        except Exception as e:
            print("Decode error:", e)
            await loop.run_in_executor(None, consumer.negative_acknowledge, msg)
            continue

        await loop.run_in_executor(None, consumer.acknowledge, msg)
        print("✅ Message acknowledged")

        if connected_clients:
            print(f"📤 Broadcasting to {len(connected_clients)} clients")

            await asyncio.gather(
                *(safe_send(ws, data) for ws in connected_clients),
                return_exceptions=True
            )

            print("🚀 Broadcast complete\n")
        else:
            print("⚠ No connected clients\n")