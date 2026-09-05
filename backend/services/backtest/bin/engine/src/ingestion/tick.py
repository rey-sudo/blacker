from dataclasses import dataclass

@dataclass(frozen=True)
class Tick:
    boot_id: str
    config_id: str
    tick_index: int
    trade_id: int
    time: int
    price: float
    qty: float
    is_buyer_maker: int