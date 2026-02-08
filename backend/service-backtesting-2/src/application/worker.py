import time
import traceback
import structlog
from multiprocessing import Queue
from application.events import Command, Heartbeat, Result, Shutdown, Tick, WorkerError
from src.infrastructure.logging import setup_logging


class WorkerState:
    """
    Simple state container for a worker.
    Tracks processed ticks, last result, and errors.
    """

    def __init__(self, context_id: str):
        self.context_id: str = context_id
        self.errors: list[str] = []

    def record_error(self, error_msg: str):
        """Record an error that happened in the worker."""
        self.errors.append(error_msg)

    def summary(self) -> dict:
        """Return a simple summary of the worker state."""
        return {
            "context_id": self.context_id,
            "errors_count": len(self.errors),
        }

def worker_main(
    context_id: str,
    in_queue: Queue,
    out_queue: Queue,
):
    """
    Worker process entrypoint.

    This function runs in its own OS process and acts as an isolated actor.
    It owns its internal state and processes events sequentially.

    Communication:
    - Receives commands via `in_queue`
    - Publishes events to the Head via `out_queue`
    """

    setup_logging()
    
    log = structlog.get_logger().bind(
        component="worker",
        context_id=context_id,
    )

    state = WorkerState(context_id)
    last_heartbeat = time.monotonic()

    log.info("worker_started")

    # ---------- Handler definitions ----------
    
    def handle_command(event: Command):
        try:
            log.info("evento", **vars(event))
            
        except Exception as e:
            log.exception("command_processing_failed", error=str(e))
            out_queue.put(
                WorkerError(
                    context_id=context_id,
                    error=str(e),
                )
            )

    def handle_shutdown(event: Shutdown):
        log.info("worker_shutdown_requested", reason=event.reason)
        raise StopIteration  

    handlers = {
        Command: handle_command,
        Shutdown: handle_shutdown,
    }
    
    try:
        while True:
            # Blocking wait for next command
            event = in_queue.get()
            
            

            # Dispatch event to appropriate handler
            handler = handlers.get(type(event))
            if handler:
                try:
                    handler(event)
                except StopIteration:
                    break  # exit the loop on Shutdown



            # Emit heartbeat periodically
            now = time.monotonic()
            if now - last_heartbeat >= 1.0:
                out_queue.put(
                    Heartbeat(
                        context_id=context_id,
                        ts=now,
                    )
                )
                last_heartbeat = now

    except Exception:
        # Any unexpected failure is reported upstream
        log.exception("worker_crashed")
        out_queue.put(
            WorkerError(
                context_id=context_id,
                error=traceback.format_exc(),
            )
        )

    finally:
        log.info("worker_stopped")



