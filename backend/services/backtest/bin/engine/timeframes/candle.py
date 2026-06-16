from dataclasses import dataclass
from decimal import Decimal

@dataclass(frozen=True)
class Candle:
    open: Decimal
    high: Decimal
    low: Decimal
    close: Decimal
    volume: Decimal
    start_ts: int
    end_ts: int