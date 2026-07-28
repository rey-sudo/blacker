from pulsar import Client, ConsumerType, InitialPosition
from ingestion.tick import Tick
import msgpack

SCALE = 1e8

class PulsarConsumer:
    
    def __init__(
        self,
        service_url="pulsar://localhost:6650",
        topic="persistent://public/default/ticks-dydx-BTC-USD",
        subscription="market-engine-1",
    ):
        self.client = Client(service_url)

        self.consumer = self.client.subscribe(
            topic,
            subscription_name=subscription,
            consumer_type=ConsumerType.Exclusive,
            initial_position=InitialPosition.Latest
        )

    def _decode_batch(self, msg)-> list[Tick]:
        decoded = msgpack.unpackb(msg.data(), raw=False)

        ticks = [
            Tick(
                tick[0],          # source
                tick[1],          # symbol
                tick[2],          # id
                tick[3],          # time
                tick[4] / SCALE,  # price
                tick[5] / SCALE,  # qty
                tick[6],          # is_buyer_maker
            )
            for tick in decoded[0]
        ]

        return ticks


    def listen(self, callback):
        print("Consumer listening.")

        while True:
            msg = self.consumer.receive()

            try:
                ticks = self._decode_batch(msg)

                last = len(ticks) - 1

                for i, tick in enumerate(ticks):
                    callback(
                        tick,
                        is_last=(i == last),
                    )

                self.consumer.acknowledge(msg)

            except Exception as e:
                self.consumer.negative_acknowledge(msg)
                print(f"Error listening message: {e}")
                raise
            
    def close(self):
        self.consumer.close()
        self.client.close()