import time
import pulsar
import json
import structlog
from infrastructure.logging import setup_logging

setup_logging()
log = structlog.get_logger().bind(component="test")

TOPIC = "non-persistent://public/backtesting/input"

def test_publisher():
    client = pulsar.Client("pulsar://localhost:6650")

    producer = client.create_producer(
        topic=TOPIC,
        send_timeout_millis=0,   # no retries for test
        block_if_queue_full=True
    )

    print("Test publisher started")

    try:
        for i in range(1):
            # Simulate a small set of context_ids (shards)
            context_id = f"ctx-{i % 4}"

            payload_dict = {"command": "start_worker", "params": {"symbol": "BTCUSDT"}}
            payload_bytes = json.dumps(payload_dict).encode("utf-8")

            producer.send(
                payload_bytes,
                partition_key=context_id,
            )

            log.info("event_payload", payload=payload_bytes)
            
            time.sleep(0.05)

    finally:
        producer.close()
        client.close()
        print("Test publisher stopped")

