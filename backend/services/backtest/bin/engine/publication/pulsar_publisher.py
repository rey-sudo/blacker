from pulsar import Client, Producer
from dataclasses import asdict
from core.engine import EngineState
from decimal import Decimal
import json

def serialize(state) -> bytes:
    return json.dumps(
        asdict(state),
        default=lambda o: float(o) if isinstance(o, Decimal) else o
    ).encode("utf-8")


class PulsarPublisher:
    def __init__(
        self,
        service_url="pulsar://localhost:6650",
        topic="persistent://public/default/engine.state",
    ):
        self.client = Client(service_url)

        self.producer: Producer = self.client.create_producer(
            topic
        )

    def publish(self, engine_state):
        data = serialize(engine_state)
        return self.producer.send(data)

    def close(self):
        self.producer.close()
        self.client.close()