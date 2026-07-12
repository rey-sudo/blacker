from dataclasses import dataclass

@dataclass(frozen=True)
class Tick:
    tick_index: int
    trade_id: int
    time: int
    price: float
    qty: float
    is_buyer_maker: int