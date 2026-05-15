import redis, json

r = redis.Redis(decode_responses=True)

r.publish("commands", json.dumps({"command": "start"}))
# ...
#r.publish("commands", json.dumps({"command": "stop"}))