import pulsar
import msgpack
import json
from dataclasses import dataclass

PULSAR_URL = "pulsar://localhost:6650" 
TOPIC = "persistent://public/default/ticks-dydx-BTC-USD"
SUBSCRIPTION = "engine1"

client = pulsar.Client(PULSAR_URL)

consumer = client.subscribe(
    topic=TOPIC,
    subscription_name=SUBSCRIPTION,
    consumer_type=pulsar.ConsumerType.Exclusive
)

print(f"Escuchando {TOPIC}...")


@dataclass
class Tick:
    source: str
    symbol: str
    id: int
    time: int
    price: int
    qty: int
    is_buyer_maker: int

try:
    while True:
        msg = consumer.receive()

        try:
            payload = msg.data()

            decoded = msgpack.unpackb(payload, raw=False)

            ticks = [Tick(*tick) for tick in decoded[0]]

            for tick in ticks:
                print(tick)

            consumer.acknowledge(msg)

        except Exception as e:
            print("Error decodificando:", e)
            consumer.negative_acknowledge(msg)

except KeyboardInterrupt:
    print("Finalizando...")

finally:
    consumer.close()
    client.close()