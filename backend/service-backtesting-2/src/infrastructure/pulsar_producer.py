class DummyProducer:
    """
    Placeholder del producer de Pulsar.
    Reemplazar por infra/pulsar_producer.py
    """
    def send(self, key: str, value: bytes):
        # En prod: producer.send(value, partition_key=key)
        pass
