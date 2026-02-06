import time
import uuid
import pulsar

TOPIC = "non-persistent://public/backtesting/input"


def test_publisher():
    client = pulsar.Client("pulsar://localhost:6650")

    producer = client.create_producer(
        topic=TOPIC,
        send_timeout_millis=0,   # no retries for test
        block_if_queue_full=True,
    )

    print("Test publisher started")

    try:
        for i in range(100):
            # Simulate a small set of context_ids (shards)
            context_id = f"ctx-{i % 4}"

            payload = f"tick-{i}".encode("utf-8")

            producer.send(
                payload,
                partition_key=context_id,
            )

            print(f"sent → context_id={context_id}, payload=tick-{i}")
            time.sleep(0.05)

    finally:
        producer.close()
        client.close()
        print("Test publisher stopped")

