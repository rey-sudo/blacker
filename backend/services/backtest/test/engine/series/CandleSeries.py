from engine.series.serie import Series
from engine.ingestion.tick import Tick
from dataclasses import dataclass

@dataclass(frozen=True)
class Candle:
    open: float
    high: float
    low: float
    close: float
    volume: float
    start_ts: int
    end_ts: int

class CandleSeries(Series):
    """
    Aggregates market ticks into OHLCV candles.
    """

    def __init__(self, timeframe_ms: int):
        super().__init__()

        self.timeframe_ms = timeframe_ms

        self.live: Candle | None = None
        self.history: list[Candle] = []

        self.is_new: bool = False

    def update(self, tick: Tick) -> None:
        bucket = tick.time // self.timeframe_ms

        #
        # First candle.
        #
        if self.live is None:
            self.live = self._new_candle(bucket, tick)
            self.is_new = True
            return

        current_bucket = self.live.start_ts // self.timeframe_ms

        #
        # New candle.
        #
        if bucket != current_bucket:
            self.history.append(self.live)

            self.live = self._new_candle(bucket, tick)
            self.is_new = True
            return

        #
        # Update current candle.
        #
        self.live.high = max(self.live.high, tick.price)
        self.live.low = min(self.live.low, tick.price)
        self.live.close = tick.price
        self.live.volume += tick.qty

        self.is_new = False

    def _new_candle(self, bucket: int, tick: Tick) -> Candle:
        return Candle(
            open=tick.price,
            high=tick.price,
            low=tick.price,
            close=tick.price,
            volume=tick.qty,
            start_ts=bucket * self.timeframe_ms,
            end_ts=(bucket + 1) * self.timeframe_ms,
        )