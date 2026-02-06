import asyncio
import queue
from multiprocessing import Process, Queue
import time
from typing import Dict

import structlog
from application.events import Tick, Shutdown, Result, Heartbeat, WorkerError
from application.worker import worker_main

log = structlog.get_logger().bind(component="head")

class WorkerRef:
    """
    Reference to a worker process.

    Owns:
    - input queue (head -> worker)
    - process handle
    - liveness metadata
    """

    def __init__(self, context_id: str, out_queue: Queue):
        self.context_id = context_id
        self.in_queue: Queue = Queue(maxsize=10_000)
        self.out_queue = out_queue
        self.process = Process(
            target=worker_main,
            args=(context_id, self.in_queue, self.out_queue),
            daemon=True,
        )
        self.last_seen: float = time.monotonic()

        self.process.start()

        log.info("worker_spawned", context_id=context_id)

    def send(self, msg):
        self.in_queue.put(msg)

    def shutdown(self, reason: str):
        try:
            self.send(Shutdown(reason))
        except Exception:
            pass


class AppState:
    """
    Global application state and supervisor.

    AppState owns the lifecycle of all worker processes and provides
    deterministic routing by `context_id`.

    This class:
    - keeps track of active workers
    - enforces a maximum worker limit
    - spawns workers lazily
    - handles graceful worker shutdown

    AppState is single-threaded and is owned exclusively by the Head
    (asyncio event loop). No locking is required.
    """    
    def __init__(self, max_workers: int = 128):
        """
        Initialize the application state.

        Args:
            max_workers (int):
                Maximum number of concurrent worker processes allowed.
                Acts as a hard safety limit to prevent resource exhaustion.
        """
        

        # Hard upper bound on the number of active workers
        self.max_workers = max_workers
        # Maps context_id -> WorkerRef
        self.workers: Dict[str, WorkerRef] = {}
        
        self.worker_event_queue: Queue = Queue(maxsize=100_000)

    def get_or_spawn(self, context_id: str) -> WorkerRef:
        """
        Get the worker responsible for the given context_id.
        
        If no worker exists for this context, a new one is spawned and
        registered. Exactly one worker exists per context_id.

        Args:
            context_id (str):
            
        Returns:
            WorkerRef:
                Reference to the worker process handling this context.

        Raises:
            RuntimeError:
                If the maximum number of workers has been reached.
        """        
        if context_id not in self.workers:
            # Enforce global worker limit
            if len(self.workers) >= self.max_workers:
                raise RuntimeError("max_workers_limit")
            
            # Lazily spawn a new worker for this context
            self.workers[context_id] = WorkerRef(
                context_id=context_id,
                out_queue=self.worker_event_queue,
            )
            
        return self.workers[context_id]
    
    def touch(self, context_id: str):
        worker = self.workers.get(context_id)
        if worker:
            worker.last_seen = time.monotonic()
            
    def remove(self, context_id: str):
        """
        Remove and gracefully shut down the worker for the given context_id.

        This method performs best-effort cleanup:
        - removes the worker from the registry
        - sends a Shutdown event to the worker
        - never raises, even if shutdown fails

        Args:
            context_id (str):
                Identifier of the worker to be removed.
        """        
        worker = self.workers.pop(context_id, None)
        
        if not worker:
            return
        
        log.warn("remove_worker_completed", context_id=context_id)
          
        if worker:
            try:
                worker.shutdown("removed")
                worker.process.join(timeout=1.0)
                log.warn("remove_worker_shutdown", context_id=context_id)
            except Exception:
                pass

    async def shutdown_all(self):
        """
        Request graceful shutdown of all active workers.

        This method is synchronous and non-blocking.
        It only sends shutdown events and clears internal state.
        """
        log.info("shutdown_all_started")
        
        for ctx in list(self.workers.keys()):
            self.remove(ctx)
            
        await asyncio.sleep(0.2)
            
        log.info("shutdown_all_completed")



async def bridge_worker_events(
    mp_queue: Queue,
    async_queue: asyncio.Queue,
):
    """
    Bridges multiprocessing.Queue -> asyncio.Queue.

    This isolates blocking IPC from the event loop.
    """
    loop = asyncio.get_running_loop()

    while True:
        event = await loop.run_in_executor(None, mp_queue.get)
        await async_queue.put(event)

        
async def handle_worker_events(
    app_state: AppState,
    producer,
    shared_queue: asyncio.Queue,
):
    """
    Central event dispatcher for worker-generated events.
    """
    while True:
        event = await shared_queue.get()

        if isinstance(event, Result):
            producer.send(
                key=event.context_id,
                value=event.payload,
            )

        elif isinstance(event, Heartbeat):
            app_state.touch(event.context_id)

        elif isinstance(event, WorkerError):
            log.error(
                "worker_error",
                context_id=event.context_id,
                error=event.error,
            )
            app_state.remove(event.context_id)