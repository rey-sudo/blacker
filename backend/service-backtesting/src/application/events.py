from dataclasses import dataclass
from typing import Any
import time

# ---- Head -> Worker events ----
@dataclass
class Command:
    type: str
    context_id: str
    params: bytes
    
@dataclass
class Tick:
    context_id: str
    payload: bytes

@dataclass
class Shutdown:
    reason: str = ""

# ---- Worker -> Head events ----

@dataclass
class Result:
    context_id: str
    payload: bytes

@dataclass
class Heartbeat:
    context_id: str
    ts: float = time.time()

@dataclass
class WorkerError:
    context_id: str
    error: str
