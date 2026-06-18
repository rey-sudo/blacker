from pulsar import Client, Producer
from dataclasses import is_dataclass
import msgpack

def default(obj):
    if is_dataclass(obj):
        return obj.__dict__
    raise TypeError(f"Cannot serialize {type(obj)}")

def serialize(state) -> bytes:
    return msgpack.packb(
        state,
        default=default,
        use_bin_type=True,
    )

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

    def _noop(self, result, msg_id):
        pass

    def publish(self, engine_state):
        self.producer.send_async(
            serialize(engine_state),
            callback=self._noop,
            partition_key="engine.state",
        )

    def close(self):
        self.producer.flush()
        self.producer.close()
        self.client.close()