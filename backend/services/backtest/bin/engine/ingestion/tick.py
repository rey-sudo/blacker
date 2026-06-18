from dataclasses import dataclass

@dataclass(frozen=True)
class Tick:
    trade_id: int
    timestamp_ms: int
    price: float
    qty: float
    side: int