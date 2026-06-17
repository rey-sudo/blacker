import redis
import json
from dataclasses import asdict

class RedisPublisher:
    def __init__(self, stream="backtester:engine:stream"):
        self.r = redis.Redis(host="localhost", port=6380)
        self.stream = stream

    def publish(self, engine_state):
        state_json = json.dumps(asdict(engine_state), default=str)

        payload = {
            "time": engine_state.time,
            "state_data": state_json
        }

        #print(payload)

        return self.r.xadd(self.stream, payload)

    def purge_stream(self):
        self.r.xtrim(self.stream, maxlen=0, approximate=False)