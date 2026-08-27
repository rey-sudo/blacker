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
from series.series import Series


MAX_HISTORY = 500


@dataclass(frozen=True)
class EMAValue:
    time: int
    value: float


class EMA(Series):

    def __init__(
        self,
        id: str,
        kind: str,
        level: int,
        params: dict,
        parent_id: str | None,
    ):
        super().__init__(
            id,
            kind,
            level,
            params,
            parent_id,
        )

        self.period = int(params.get("period", 55))

        if self.period <= 0:
            raise ValueError("EMA period must be greater than 0")

        self._live: EMAValue | None = None

        self.history: deque[EMAValue] = deque(
            maxlen=MAX_HISTORY
        )

    @property
    def live(self) -> EMAValue | None:
        return self._live

    @live.setter
    def live(self, value: EMAValue | None):
        self._live = value

    def _calculate(self, close: float) -> float:
        alpha = 2.0 / (self.period + 1.0)

        if self.live is None:
            return close

        return (
            alpha * close
            + (1.0 - alpha) * self.live.value
        )

    def update(self) -> None:
        """
        Actualiza la EMA usando el close de la Candle actual.

        Candlestick es la Series padre y proporciona:

            timeframe.live
            timeframe.is_new

        La EMA solamente transforma:

            Candle.close -> EMA
        """

        timeframe = self._timeframe
        candle = timeframe.live

        if candle is None:
            return

        value = EMAValue(
            time=candle.time,
            value=self._calculate(candle.close),
        )

        # --------------------------------------------------
        # Nueva Candle del timeframe
        # --------------------------------------------------

        if timeframe.is_new:

            if self.live is not None:
                self.history.append(self.live)

            self.live = value
            return

        # --------------------------------------------------
        # Actualización de la Candle actual
        # --------------------------------------------------

        self.live = value

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "kind": self.kind,
            "level": self.level,
            "params": self.params,
            "parent_id": self.parent_id,
            "live": (
                asdict(self.live)
                if self.live is not None
                else None
            ),
            "history": [
                asdict(value)
                for value in self.history
            ],
        }

    def set_state(self, state: dict) -> None:

        live_state = state.get("live")

        self.live = (
            EMAValue(**live_state)
            if live_state is not None
            else None
        )

        self.history = deque(
            (
                EMAValue(**value)
                for value in (state.get("history") or [])
            ),
            maxlen=MAX_HISTORY,
        )