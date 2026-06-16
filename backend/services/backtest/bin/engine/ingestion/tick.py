from dataclasses import dataclass
from decimal import Decimal

@dataclass(frozen=True)
class Tick:
    trade_id: int
    timestamp_ms: int
    price: Decimal
    qty: Decimal
    side: int