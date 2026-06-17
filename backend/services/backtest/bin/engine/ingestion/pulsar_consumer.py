from pulsar import Client, ConsumerType
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
        )

    def listen(self, callback):
        while True:
            msg = self.consumer.receive()

            try:
                data = msgpack.unpackb(
                    msg.data(),
                    raw=False,
                )

                trade_id, timestamp_ms, price, qty, side = data

                tick = Tick(
                    trade_id=int(trade_id),
                    timestamp_ms=int(timestamp_ms),
                    price=Decimal(price) / self.SCALE,
                    qty=Decimal(qty) / self.SCALE,
                    side=int(side),
                )

                callback(tick)

                self.consumer.acknowledge(msg)

            except Exception:
                self.consumer.negative_acknowledge(msg)
                raise

    def close(self):
        self.consumer.close()
        self.client.close()