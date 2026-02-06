import asyncio
import signal
import structlog

from src.infrastructure.logging import setup_logging
from src.application.run import run

log = structlog.get_logger().bind(component="head")


def main():
    """
    Service entrypoint.

    This function is responsible for:
    - Creating and owning the asyncio event loop
    - Running the main async task
    - Handling OS-level shutdown signals (SIGINT, SIGTERM)
    - Ensuring graceful cancellation and cleanup
    """
    setup_logging()
     
    # Create a dedicated event loop for the service.
    # This avoids relying on any implicit or already-running loop.
    log.info("creating_main_loop")
    main_loop = asyncio.new_event_loop()
    asyncio.set_event_loop(main_loop)
    

    # Schedule the main async coroutine that drives the service lifecycle.
    log.info("creating_main_task")
    main_task = main_loop.create_task(run())

    # Register signal handlers to gracefully shut down the service.
    # On SIGINT (Ctrl+C) or SIGTERM (container stop), the main task
    # is cancelled, which triggers orderly shutdown logic downstream.
    for sig in (signal.SIGINT, signal.SIGTERM):
        main_loop.add_signal_handler(
            sig,
            lambda: main_task.cancel(),
        )
           
    try:
        # Block the main thread until the main task completes
        # (normally or via cancellation).
        log.info("running_main_task") 
        main_loop.run_until_complete(main_task)
    finally:
        # Always close the event loop to release resources
        # such as open transports, file descriptors, and selectors.
        log.info("closing_main_task") 
        main_loop.close()

if __name__ == "__main__":
    main()
