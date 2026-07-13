from pulsar import Client, Producer

class PulsarPublisher:
    def __init__(
        self,
        service_url="pulsar://localhost:6650",
        topic="persistent://public/default/engine.state",
    ):
        self.client = Client(service_url)

        self.producer: Producer = self.client.create_producer(topic)


    def publish(self, engine_state):
        self.producer.send(engine_state.to_msgpack())

    def close(self):
        self.producer.flush()
        self.producer.close()
        self.client.close()