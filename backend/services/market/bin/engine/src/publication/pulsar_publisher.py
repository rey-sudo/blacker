from pulsar import Client, Producer

class PulsarPublisher:
    def __init__(
        self,
        service_url="pulsar://localhost:6650",
        topic_prefix="persistent://public/default/live-engine-id",
    ):
        self.client = Client(service_url)
        self.topic_prefix = topic_prefix
        self.producers: dict[str, Producer] = {}

    def _get_producer(self, timeframe: str) -> Producer:
        if timeframe not in self.producers:
            topic = f"{self.topic_prefix}-{timeframe}"
            self.producers[timeframe] = self.client.create_producer(topic)

        return self.producers[timeframe]

    def publish(self, timeframe: str, payload: bytes):
        producer = self._get_producer(timeframe)
        producer.send(payload)

    def close(self):
        for producer in self.producers.values():
            producer.flush()
            producer.close()

        self.client.close()