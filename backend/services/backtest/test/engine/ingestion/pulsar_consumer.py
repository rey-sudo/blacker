from pulsar import Client, ConsumerType, InitialPosition
from ingestion.tick import Tick
import msgpack

SCALE = 1e8

class PulsarConsumer:
    
    def __init__(
        self,
        service_url="pulsar://localhost:6650",
        topic="persistent://public/default/master.tick",
        subscription="engine-sub",
    ):
        self.client = Client(service_url)

        self.consumer = self.client.subscribe(
            topic,
            subscription_name=subscription,
            consumer_type=ConsumerType.Exclusive,
            initial_position=InitialPosition.Latest
        )

    def _decode_tick(self, msg):
        (   
            boot_id,
            tick_index,
            trade_id,
            time,
            price,
            qty,
            is_buyer_maker,
        ) = msgpack.unpackb(msg.data(), raw=False)

        return Tick(
            boot_id=boot_id,
            tick_index=tick_index,
            trade_id=trade_id,
            time=time,
            price=float(price) / SCALE,
            qty=float(qty) / SCALE,
            is_buyer_maker=is_buyer_maker,
        )

    def listen(self, callback):
        print("Consumer listening.")
        while True:
            msg = self.consumer.receive()

            try:
                tick = self._decode_tick(msg)
                callback(tick)
                
                self.consumer.acknowledge(msg)

            except Exception as e:
                self.consumer.negative_acknowledge(msg)
                print(f"Error listening message: {e}")
                continue

    def close(self):
        self.consumer.close()
        self.client.close()