import json
import time as t
import pulsar
import msgpack

PULSAR_URL = "pulsar://localhost:6650"

MASTER_TICK_TOPIC = "persistent://public/default/master.tick"
ENGINE_STATE_TOPIC = "persistent://public/default/engine.state"

client = pulsar.Client(PULSAR_URL)

consumer = client.subscribe(
    MASTER_TICK_TOPIC,
    subscription_name="engine-sub",
    consumer_type=pulsar.ConsumerType.Exclusive
)

producer = client.create_producer(ENGINE_STATE_TOPIC)

print("Engine service started.")

try:
    while True:
        msg = consumer.receive()

        try:
            t.sleep(5)

            (
                tick_index,
                trade_id,
                time,
                price,
                qty,
                is_buyer_maker,
            ) = msgpack.unpackb(msg.data(), raw=False)

            print(
                f"Received tick "
                f"tick_index={tick_index}"
            )

            engine_state = {
                "data": "hola",
                "tick_index": tick_index,
            }

            producer.send(
                json.dumps(engine_state).encode("utf-8")
            )



            consumer.acknowledge(msg)

        except Exception as e:
            print(f"Processing error: {e}")
            consumer.negative_acknowledge(msg)

except KeyboardInterrupt:
    print("Stopping...")

finally:
    producer.close()
    consumer.close()
    client.close()