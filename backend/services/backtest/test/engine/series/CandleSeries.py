from series.series import Series
from ingestion.tick import Tick
from dataclasses import asdict, dataclass

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

    def __init__(self):
        super().__init__("CandleSeries")

        self.live: Candle | None = None
        self.history: list[Candle] = []
        self.is_new: bool = False
        
    def to_dict(self):
        return {
            "name": self.name,
            "live": asdict(self.live) if self.live is not None else None,
            "history": [asdict(candle) for candle in self.history],
            "is_new": self.is_new,
        }
    
    def set_state(self, state: dict) -> None:
        """
        Restores the series from a serialized state.
        """

        self.name = state["name"]

        self.live = (
            Candle(**state["live"])
            if state["live"] is not None
            else None
        )

        self.history = [
            Candle(**candle)
            for candle in state["history"]
        ]

        self.is_new = state["is_new"]

    def update(self, tick: Tick) -> None:
        bucket = tick.time // self.timeframe_ms

        #
        # First candle.
        #
        if self.live is None:
            self.live = self._new_candle(bucket, tick)
            self.is_new = True
            return

        live = self.live
        current_bucket = live.start_ts // self.timeframe_ms

        #
        # New candle.
        #
        if bucket != current_bucket:
            self.history.append(live)

            self.live = self._new_candle(bucket, tick)
            self.is_new = True
            return

        #
        # Update current candle.
        #
        self.live = Candle(
            open=live.open,
            high=max(live.high, tick.price),
            low=min(live.low, tick.price),
            close=tick.price,
            volume=live.volume + tick.qty,
            start_ts=live.start_ts,
            end_ts=live.end_ts,
        )

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