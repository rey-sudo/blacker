from pulsar import Client, Producer
from dataclasses import asdict
import json


def serialize(state) -> bytes:
    return json.dumps(
        asdict(state)
    ).encode("utf-8")


class PulsarPublisher:
    def __init__(
        self,
        service_url="pulsar://localhost:6650",
        topic="persistent://public/default/engine.state",
    ):
        self.client = Client(service_url)

        self.producer: Producer = self.client.create_producer(
            topic,
            batching_enabled=True,
            batching_max_messages=1000,
            batching_max_publish_delay_ms=10,
        )

    def publish(self, engine_state):
        self.producer.send_async(
            serialize(engine_state),
            callback=lambda res, msg: None,
            partition_key="engine.state",
        )

    def close(self):
        self.producer.flush()
        self.producer.close()
        self.client.close()