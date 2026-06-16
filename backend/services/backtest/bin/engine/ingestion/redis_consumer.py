import redis
from ingestion.tick import Tick
from decimal import Decimal

class RedisConsumer:
    def __init__(self, stream, group, consumer):
        self.r = redis.Redis(host="localhost", port=6380)
        self.stream = stream
        self.group = group
        self.consumer = consumer

        self._ensure_group()

    def _ensure_group(self):
        try:
            self.r.xgroup_create(
                name=self.stream,
                groupname=self.group,
                id="0",
                mkstream=True
            )
        except redis.exceptions.ResponseError as e:
            if "BUSYGROUP" in str(e):
                return
            raise

    def listen(self, callback):
        while True:
            resp = self.r.xreadgroup(
                self.group,
                self.consumer,
                {self.stream: ">"},
                block=1000,
                count=1
            )

            if not resp:
                continue

            for _, messages in resp:
                for msg_id, data in messages:

                    SCALE = Decimal("100000000")

                    tick = Tick(
                        trade_id=int(data[b"trade_id"]),
                        timestamp_ms=int(data[b"timestamp_ms"]),
                        price=Decimal(data[b"price"].decode()) / SCALE,
                        qty=Decimal(data[b"qty"].decode()) / SCALE,
                        side=int(data[b"side"]),
                    )

                    callback(tick)
