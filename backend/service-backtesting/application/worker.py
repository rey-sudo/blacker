import time
import traceback
from multiprocessing import Queue
from application.events import Tick, Shutdown, Result, Heartbeat, WorkerError


def worker_main(context_id: str, in_q: Queue, out_q: Queue):
    """Actor-style worker. Owns its state and processes events sequentially."""
    state = init_state(context_id)
    last_hb = time.time()

    try:
        while True:
            event = in_q.get()

            if isinstance(event, Tick):
                try:
                    result = process_tick(state, event.payload)
                    if result is not None:
                        out_q.put(Result(context_id, result))
                except Exception as e:
                    out_q.put(WorkerError(context_id, str(e)))

            elif isinstance(event, Shutdown):
                break

            # heartbeat every second
            if time.time() - last_hb > 1.0:
                out_q.put(Heartbeat(context_id, time.time()))
                last_hb = time.time()

    except Exception:
        out_q.put(WorkerError(context_id, traceback.format_exc()))


# ---- domain-specific logic ----

def init_state(context_id: str) -> dict:
    return {"context_id": context_id, "ticks": 0}


def process_tick(state: dict, payload: bytes) -> bytes:
    # example CPU-bound logic
    state["ticks"] += 1
    return payload  # replace with real computation
