from multiprocessing import Queue, Process
from application.events import Result, Shutdown, Tick
from application.worker import worker_main


def test_worker_processes_tick_and_emits_result():
    """
    Integration-style unit test.

    Validates that:
    - a worker process can be started
    - it receives a Tick via its input queue
    - it emits a Result event via the event queue
    """

    context_id = "test-ctx"

    # Queues simulating head <-> worker IPC
    in_q = Queue()
    event_q = Queue()

    # Start worker process
    process = Process(
        target=worker_main,
        args=(context_id, in_q, event_q),
    )
    process.start()

    try:
        # Send a Tick to the worker
        in_q.put(
            Tick(
                context_id=context_id,
                payload=b"test-tick",
            )
        )

        # Read event from worker (blocking, with timeout)
        event = event_q.get(timeout=2.0)

        # Validate event type and contents
        assert isinstance(event, Result)
        assert event.context_id == context_id
        assert event.payload == b"test-tick"

    finally:
        # Shutdown worker cleanly
        in_q.put(Shutdown("test_complete"))
        process.join(timeout=2.0)

        if process.is_alive():
            process.terminate()
