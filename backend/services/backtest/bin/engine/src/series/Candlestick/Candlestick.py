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

from collections import deque
from dataclasses import asdict, dataclass

from aggregator.bar_aggregator import Bar
from series.series import Series


MAX_HISTORY = 500


@dataclass(frozen=True)
class Candle:
    time: int
    open: float
    high: float
    low: float
    close: float
    volume: float
    start_ts: int
    end_ts: int


class Candlestick(Series):

    def __init__(
        self,
        id: str,
        kind: str,
        level: int,
        primary: bool,
        overlay: bool,
        params: dict,
    ):
        super().__init__(
            id,
            kind,
            level,
            primary,
            overlay,
            params
        )

        self._live: Candle | None = None

        self.history: deque[Candle] = deque(
            maxlen=MAX_HISTORY
        )

    @property
    def live(self) -> Candle | None:
        return self._live

    @live.setter
    def live(self, value: Candle | None):
        self._live = value

    @staticmethod
    def _to_candle(bar: Bar) -> Candle:
        return Candle(
            time=bar.time,
            open=bar.open,
            high=bar.high,
            low=bar.low,
            close=bar.close,
            volume=bar.total_volume,
            start_ts=bar.start_ts,
            end_ts=bar.end_ts,
        )

    def update(self) -> None:
        """
        Actualiza la Candle usando la barra actual
        de su Timeframe.

        BarAggregator construye y actualiza la Bar.

        Timeframe.is_new indica si la Bar actual
        acaba de comenzar.

        Candlestick solamente transforma Bar -> Candle
        y administra live/history.
        """

        timeframe = self._timeframe
        bar = timeframe.live

        if bar is None:
            return

        # --------------------------------------------------
        # Nueva barra del timeframe
        # --------------------------------------------------

        if timeframe.is_new:

            if self.live is not None:
                self.history.append(self.live)

            self.live = self._to_candle(bar)

            return

        # --------------------------------------------------
        # Actualización de la barra actual
        # --------------------------------------------------

        self.live = self._to_candle(bar)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "kind": self.kind,
            "level": self.level,
            "primary": self.primary,
            "overlay": self.overlay,
            "params": self.params,

            "live": (
                asdict(self.live)
                if self.live is not None
                else None
            ),

            "history": [
                asdict(candle)
                for candle in self.history
            ],
        }

    def set_state(self, state: dict) -> None:
        live_state = state.get("live")

        self.live = (
            Candle(**live_state)
            if live_state is not None
            else None
        )

        self.history = deque(
            (
                Candle(**candle)
                for candle in (state.get("history") or [])
            ),
            maxlen=MAX_HISTORY,
        )