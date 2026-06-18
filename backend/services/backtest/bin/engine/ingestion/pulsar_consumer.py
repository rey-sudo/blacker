from pulsar import Client, ConsumerType, ConsumerBatchReceivePolicy
from ingestion.tick import Tick
from decimal import Decimal
import msgpack

class PulsarConsumer:
    SCALE = Decimal("100000000")

    def __init__(
        self,
        service_url="pulsar://localhost:6650",
        topic="persistent://public/default/ticks",
        subscription="backtest-engine",
    ):
        self.client = Client(service_url)

        self.consumer = self.client.subscribe(
            topic,
            subscription_name=subscription,
            consumer_type=ConsumerType.Exclusive,
            batch_receive_policy=ConsumerBatchReceivePolicy(
                max_num_message=1_000,
                max_num_bytes=20 * 1024 * 1024,
                timeout_ms=10,
            )
        )

    def _decode_tick(self, msg):
        data = msgpack.unpackb(
            msg.data(),
            raw=False,
        )

        trade_id, timestamp_ms, price, qty, side = data

        return Tick(
            trade_id=int(trade_id),
            timestamp_ms=int(timestamp_ms),
            price=Decimal(price) / self.SCALE,
            qty=Decimal(qty) / self.SCALE,
            side=int(side),
        )

    def listen(self, callback):
        while True:
            messages = self.consumer.batch_receive()

            try:
                for msg in messages:
                    tick = self._decode_tick(msg)
                    callback(tick)
                    self.consumer.acknowledge(msg)

            except Exception:
                for msg in messages:
                    self.consumer.negative_acknowledge(msg)
                raise

    def close(self):
        self.consumer.close()
        self.client.close()