from collections import defaultdict
from decimal import Decimal
from .candle import Candle

class TimeframeAggregator:
    def __init__(self, name: str, timeframe_ms: int):
        self.name = name
        self.tf = timeframe_ms
        self.candles = {}
        self.indicators = {}

    def _bucket(self, ts: int) -> int:
        return ts // self.tf

    def update(self, tick):

        bucket = self._bucket(tick.timestamp_ms)

        if bucket not in self.candles:
            candle = Candle(
                open=tick.price,
                high=tick.price,
                low=tick.price,
                close=tick.price,
                volume=tick.qty,
                start_ts=bucket * self.tf,
                end_ts=(bucket + 1) * self.tf,
            )
            self.candles[bucket] = candle
            return candle, True  # 👈 nuevo candle

        old = self.candles[bucket]

        new_candle = Candle(
            open=old.open,
            high=max(old.high, tick.price),
            low=min(old.low, tick.price),
            close=tick.price,
            volume=old.volume + tick.qty,
            start_ts=old.start_ts,
            end_ts=old.end_ts,
        )

        self.candles[bucket] = new_candle

        return new_candle, False  # 👈 update

        #HERE OCCURS INDICATOR CALCULATION