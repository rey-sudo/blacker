# BLACKER
# Copyright (C) 2026 Juan José Caballero Rey
#
# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation version 3 of the License.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
# GNU General Public License for more details.
#
# You should have received a copy of the GNU General Public License
# along with this program. If not, see <https://www.gnu.org/licenses/>.

from series.series import Series
from ingestion.tick import Tick
from dataclasses import asdict, dataclass
from typing import Literal


@dataclass(frozen=True)
class CandleBubble:
    time: int
    open: float
    high: float
    low: float
    close: float
    volume: float
    start_ts: int
    end_ts: int

    buy_qty: float
    sell_qty: float
    delta_pct: float
    signal: float
    bubble_color: Literal["green", "red", "gray"]
    bubble_size: float
    show_bubble: bool
    tick_count: int


_THRESHOLD = 0.01
_EMA_SPAN = 5
_EMA_ALPHA = 2 / (_EMA_SPAN + 1)  # α for span=20


class CandleBubbleSeries(Series):
    """
    Aggregates market ticks into OHLCV candles enriched with
    order-flow bubble signals (buy/sell imbalance via EMA).
    """

    def __init__(self):
        super().__init__("CandleBubbleSeries")

        self.live: CandleBubble | None = None
        self.history: list[CandleBubble] = []
        self.is_new: bool = False

        # Running EMA of delta_pct across closed candles.
        self._ema: float | None = None

    # ------------------------------------------------------------------
    # Serialization
    # ------------------------------------------------------------------

    def to_dict(self) -> dict:
        return {
            "name": self.name,
            "live": asdict(self.live) if self.live is not None and len(self.history) > 0 else None,
            "history": [asdict(c) for c in self.history],
            "is_new": self.is_new,
            "_ema": self._ema,
        }

    def set_state(self, state: dict) -> None:
        self.name = state["name"]

        self.live = (
            CandleBubble(**state["live"])
            if state["live"] is not None
            else None
        )

        self.history = [CandleBubble(**c) for c in state["history"]]
        self.is_new = state["is_new"]
        self._ema = state["_ema"]

    # ------------------------------------------------------------------
    # Update
    # ------------------------------------------------------------------

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
        # New candle: close the live one, update EMA, open a fresh candle.
        #
        if bucket != current_bucket:
            # Advance EMA with the just-closed candle's raw delta.
            self._ema = self._next_ema(live.delta_pct)

            # Re-stamp the closed candle with the final EMA-derived fields.
            closed = self._apply_signal(live, self._ema)
            self.history.append(closed)

            self.live = self._new_candle(bucket, tick)
            self.is_new = True
            return

        #
        # Update current (live) candle.
        #
        new_buy_qty = live.buy_qty + (0.0 if tick.is_buyer_maker else tick.qty)
        new_sell_qty = live.sell_qty + (tick.qty if tick.is_buyer_maker else 0.0)

        delta_pct = _delta_pct(new_buy_qty, new_sell_qty)

        # Use the *running* EMA (not yet closed) as a preview signal.
        preview_signal = self._next_ema(delta_pct) if self._ema is not None else delta_pct

        self.live = CandleBubble(
            time=live.start_ts // 1000,
            open=live.open,
            high=max(live.high, tick.price),
            low=min(live.low, tick.price),
            close=tick.price,
            volume=live.volume + tick.qty,
            start_ts=live.start_ts,
            end_ts=live.end_ts,
            buy_qty=new_buy_qty,
            sell_qty=new_sell_qty,
            delta_pct=delta_pct,
            tick_count=live.tick_count + 1,
            **_bubble_fields(preview_signal),
        )

        self.is_new = False

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    def _new_candle(self, bucket: int, tick: Tick) -> CandleBubble:
        buy_qty = 0.0 if tick.is_buyer_maker else tick.qty
        sell_qty = tick.qty if tick.is_buyer_maker else 0.0
        delta_pct = _delta_pct(buy_qty, sell_qty)

        # Preview signal: peek what EMA would be if this tick closed now.
        # _next_ema handles self._ema=None (returns delta_pct as seed).
        # self._ema is NOT mutated here — only on candle close.
        signal = self._next_ema(delta_pct)
        start_ts = bucket * self.timeframe_ms

        return CandleBubble(
            time=start_ts // 1000,
            open=tick.price,
            high=tick.price,
            low=tick.price,
            close=tick.price,
            volume=tick.qty,
            start_ts=start_ts,
            end_ts=(bucket + 1) * self.timeframe_ms,
            buy_qty=buy_qty,
            sell_qty=sell_qty,
            delta_pct=delta_pct,
            tick_count=1,
            **_bubble_fields(signal),
        )

    def _next_ema(self, value: float) -> float:
        """Incremental EMA update (span=20, α=2/21)."""
        if self._ema is None:
            return value
        return _EMA_ALPHA * value + (1 - _EMA_ALPHA) * self._ema

    @staticmethod
    def _apply_signal(candle: CandleBubble, signal: float) -> CandleBubble:
        """Return a new candle with EMA-derived bubble fields re-computed."""
        return CandleBubble(
            time=candle.time,
            open=candle.open,
            high=candle.high,
            low=candle.low,
            close=candle.close,
            volume=candle.volume,
            start_ts=candle.start_ts,
            end_ts=candle.end_ts,
            buy_qty=candle.buy_qty,
            sell_qty=candle.sell_qty,
            delta_pct=candle.delta_pct,
            tick_count=candle.tick_count,
            **_bubble_fields(signal),
        )


# ------------------------------------------------------------------
# Pure functions (no side effects, easy to unit-test)
# ------------------------------------------------------------------

def _delta_pct(buy_qty: float, sell_qty: float) -> float:
    total = buy_qty + sell_qty
    if total == 0.0:
        return 0.0
    return (buy_qty - sell_qty) / total


def _bubble_fields(signal: float) -> dict:
    show_bubble = abs(signal) > _THRESHOLD

    if not show_bubble:
        color: Literal["green", "red", "gray"] = "gray"
    elif signal > 0:
        color = "green"
    else:
        color = "red"

    size = (15 + 80 * abs(signal)) if show_bubble else 0.0

    return {
        "signal": signal,
        "show_bubble": show_bubble,
        "bubble_color": color,
        "bubble_size": size,
    }