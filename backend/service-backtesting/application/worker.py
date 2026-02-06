import time
import traceback
import structlog
from multiprocessing import Queue
from typing import Any

from application.events import Heartbeat, Result, Shutdown, Tick, WorkerError




def worker_main(
    context_id: str,
    in_q: Queue,
    event_q: Queue,
):
    """
    Worker process entrypoint.

    This function runs in its own OS process and acts as an isolated actor.
    It owns its internal state and processes events sequentially.

    Communication:
    - Receives commands via `in_q`
    - Publishes events to the Head via `event_q`
    """

    log = structlog.get_logger().bind(
        component="worker",
        context_id=context_id,
    )

    state = init_state(context_id)
    last_heartbeat = time.monotonic()

    log.info("worker_started")

    try:
        while True:
            # Blocking wait for next command
            event = in_q.get()

            if isinstance(event, Tick):
                try:
                    result = process_tick(state, event.payload)

                    if result is not None:
                        event_q.put(
                            Result(
                                context_id=context_id,
                                payload=result,
                            )
                        )

                except Exception as e:
                    log.exception("tick_processing_failed")
                    event_q.put(
                        WorkerError(
                            context_id=context_id,
                            error=str(e),
                        )
                    )

            elif isinstance(event, Shutdown):
                log.info("worker_shutdown_requested", reason=event.reason)
                break

            # Emit heartbeat periodically
            now = time.monotonic()
            if now - last_heartbeat >= 1.0:
                event_q.put(
                    Heartbeat(
                        context_id=context_id,
                        ts=now,
                    )
                )
                last_heartbeat = now

    except Exception:
        # Any unexpected failure is reported upstream
        log.exception("worker_crashed")
        event_q.put(
            WorkerError(
                context_id=context_id,
                error=traceback.format_exc(),
            )
        )

    finally:
        log.info("worker_stopped")


# ---------- Domain logic (pure, testable) ----------

def init_state(context_id: str) -> dict[str, Any]:
    """
    Initialize worker-local state.
    """
    return {
        "context_id": context_id,
        "ticks_processed": 0,
    }


def process_tick(state: dict[str, Any], payload: bytes) -> bytes:
    """
    Process a single tick.

    This function is CPU-bound and deterministic.
    It mutates only local state and returns an optional result.
    """
    # Example computation
    state["ticks_processed"] += 1

    # Replace with real backtesting logic
    return payload
