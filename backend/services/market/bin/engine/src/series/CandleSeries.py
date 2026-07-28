from collections import deque
from dataclasses import asdict, dataclass
from ingestion.tick import Tick
from series.series import Series

MAX_HISTORY = 500

@dataclass(frozen=True)
class Candle:
    time: int          # Unix timestamp (seconds) at candle start
    open: float
    high: float
    low: float
    close: float
    volume: float
    start_ts: int      # Inclusive (milliseconds)
    end_ts: int        # Exclusive (milliseconds)


class CandleSeries(Series):
    """
    Incrementally aggregates market ticks into OHLCV candles.

    Time intervals are interpreted as:
        [start_ts, end_ts)

    Assumptions:
    - Ticks arrive in chronological order.
    - Empty candles are NOT generated.
    """

    def __init__(self, level: int, name: str, id: str):
        super().__init__(level, name, id)

        self.live: Candle | None = None
        self.history: deque[Candle] = deque(maxlen=MAX_HISTORY)
        self.is_new: bool = False

        self.last_tick_time: int | None = None

    def to_dict(self):
        return {
            "params": {
                "level": self.level,
                "name": self.name,
                "id": self.id,
            },
            "live": asdict(self.live) if self.live else None,
            "history": [asdict(c) for c in self.history],
            "is_new": self.is_new,

            "last_tick_time": self.last_tick_time,
        }

    def set_state(self, state: dict) -> None:
        """
        Restore the series from serialized state.
        """
        self.live = (
            Candle(**state["live"])
            if state["live"] is not None
            else None
        )

        self.history = deque(
            (Candle(**candle) for candle in state["history"]),
            maxlen=MAX_HISTORY,
        )

        self.is_new = state["is_new"]

        self.last_tick_time = state["last_tick_time"]

    def update(self, tick: Tick) -> None:
        """
        Process a single market tick.
        """
        if (
            self.last_tick_time is not None
            and tick.time < self.last_tick_time
        ):
            raise ValueError(
                f"Out-of-order tick detected: "
                f"{tick.time} < {self.last_tick_time}"
            )

        bucket = tick.time // self.timeframe_ms
        start_ts = bucket * self.timeframe_ms

        #
        # First candle.
        #
        if self.live is None:
            self.live = self._new_candle(bucket, tick)
            self.is_new = True

            self.last_tick_time = tick.time
            return

        live = self.live

        #
        # New candle.
        #
        if start_ts != live.start_ts:
            self.history.append(live)
            self.live = self._new_candle(bucket, tick)
            self.is_new = True

            self.last_tick_time = tick.time
            return

        #
        # Update current candle.
        #
        self.live = Candle(
            time=live.time,
            open=live.open,
            high=max(live.high, tick.price),
            low=min(live.low, tick.price),
            close=tick.price,
            volume=live.volume + tick.qty,
            start_ts=live.start_ts,
            end_ts=live.end_ts,
        )

        self.is_new = False
        self.last_tick_time = tick.time

    def flush(self) -> None:
        """
        Finalizes the current candle.

        Call this once at the end of a backtest so the last candle
        is not lost.
        """
        if self.live is not None:
            self.history.append(self.live)
            self.live = None

        self.is_new = False
        self.last_tick_time = None
        

    def _new_candle(self, bucket: int, tick: Tick) -> Candle:
        start_ts = bucket * self.timeframe_ms
        end_ts = start_ts + self.timeframe_ms

        return Candle(
            time=start_ts // 1000,
            open=tick.price,
            high=tick.price,
            low=tick.price,
            close=tick.price,
            volume=tick.qty,
            start_ts=start_ts,
            end_ts=end_ts,
        )