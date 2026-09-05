from dataclasses import dataclass

@dataclass(frozen=True)
class Tick:
    source: str
    symbol: str
    trade_id: str
    time: int
    price: int
    qty: int
    is_buyer_maker: int    