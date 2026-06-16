from collections import defaultdict
from decimal import Decimal
from .candle import Candle

class TimeframeAggregator:
    """
    Aggregates continuous market ticks into OHLCV (Open, High, Low, Close, Volume) 
    candles for a specific timeframe.
    """    
    def __init__(self, name: str, timeframe_ms: int):
        self.name = name
        self.tf = timeframe_ms
        self.candles = {}
        self.indicators = {}

    def _bucket(self, ts: int) -> int:
        """
        Calculates the time bucket index for a given timestamp.
        """        
        return ts // self.tf

    def update(self, tick):
        """
        Processes a new market tick to create or update a timeframe candle.

        Args:
            tick: The incoming market tick (must contain price, qty, and timestamp_ms).

        Returns:
            tuple[Candle, bool]: The current Candle object and a boolean flag indicating 
                                 whether it is a newly formed candle (True) or an 
                                 update to an existing one (False).
        """        
        bucket = self._bucket(tick.timestamp_ms)
        old = self.candles.get(bucket)

        if old is None:
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
            return candle, True

        candle = Candle(
            open=old.open,
            high=max(old.high, tick.price),
            low=min(old.low, tick.price),
            close=tick.price,
            volume=old.volume + tick.qty,
            start_ts=old.start_ts,
            end_ts=old.end_ts,
        )

        self.candles[bucket] = candle
        return candle, False

        #HERE OCCURS INDICATOR CALCULATION