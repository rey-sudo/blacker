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
    start_ts: int
    end_ts: int


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

        # ==================================================
        # PARAMETERS
        # ==================================================

        self.length: int = int(
            params.get("length", 55)
        )

        if self.length <= 0:
            raise ValueError(
                "EMA length must be greater than 0"
            )

        # ==================================================
        # STATE
        # ==================================================

        # Last confirmed EMA value.
        self._live: EMAValue | None = None

        # Previous confirmed EMA values.
        self.history: deque[EMAValue] = deque(
            maxlen=MAX_HISTORY
        )

        # Used only until the initial SMA is available.
        self._seed_values: deque[float] = deque(
            maxlen=self.length
        )

        # Current confirmed EMA.
        self._ema: float | None = None

    # ======================================================
    # PROPERTIES
    # ======================================================

    @property
    def live(self) -> EMAValue | None:
        return self._live

    @live.setter
    def live(
        self,
        value: EMAValue | None,
    ) -> None:
        self._live = value

    @property
    def value(self) -> float | None:
        return self._ema

    @property
    def is_ready(self) -> bool:
        return self._ema is not None

    @property
    def alpha(self) -> float:
        """
        EMA smoothing coefficient.

        alpha = 2 / (N + 1)
        """

        return 2.0 / (
            self.length + 1.0
        )

    # ======================================================
    # EMA MATHEMATICS
    # ======================================================

    def _calculate(
        self,
        close: float,
    ) -> float | None:
        """
        Process exactly one confirmed closing price.

        Initialization:

            EMA_N = SMA_N

        Recurrence:

            EMA_t =
                alpha * Close_t
                + (1 - alpha) * EMA_(t-1)
        """

        # --------------------------------------------------
        # INITIALIZATION
        # --------------------------------------------------

        if self._ema is None:

            self._seed_values.append(close)

            if len(self._seed_values) < self.length:
                return None

            self._ema = (
                sum(self._seed_values)
                / self.length
            )

            return self._ema

        # --------------------------------------------------
        # RECURSIVE EMA
        # --------------------------------------------------

        self._ema = (
            self.alpha * close
            + (1.0 - self.alpha) * self._ema
        )

        return self._ema

    # ======================================================
    # VALUE CREATION
    # ======================================================

    @staticmethod
    def _to_value(
        bar,
        value: float,
    ) -> EMAValue:

        return EMAValue(
            time=bar.time,
            value=value,
            start_ts=bar.start_ts,
            end_ts=bar.end_ts,
        )

    # ======================================================
    # UPDATE
    # ======================================================

    def update(self) -> None:
        """
        Processes exactly one newly confirmed bar.

        The EMA never uses Timeframe.live.

        It consumes:

            Timeframe.closed

        when:

            Timeframe.is_closed == True
        """

        timeframe = self._timeframe

        # --------------------------------------------------
        # No confirmed bar event
        # --------------------------------------------------

        if not timeframe.is_closed:
            return

        bar = timeframe.closed

        if bar is None:
            return

        # --------------------------------------------------
        # Prevent duplicate processing
        # --------------------------------------------------

        if (
            self.live is not None
            and self.live.start_ts == bar.start_ts
        ):
            return

        # --------------------------------------------------
        # Previous EMA becomes history
        # --------------------------------------------------

        if self.live is not None:
            self.history.append(self.live)

        # --------------------------------------------------
        # Calculate from confirmed close
        # --------------------------------------------------

        value = self._calculate(
            bar.close
        )

        # --------------------------------------------------
        # Warm-up period
        # --------------------------------------------------

        if value is None:
            self.live = None
            return

        # --------------------------------------------------
        # Store confirmed EMA
        # --------------------------------------------------

        self.live = self._to_value(
            bar,
            value,
        )

    # ======================================================
    # SERIALIZATION
    # ======================================================

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

            "seed_values": list(
                self._seed_values
            ),

            "ema": self._ema,
        }

    # ======================================================
    # STATE RESTORATION
    # ======================================================

    def set_state(
        self,
        state: dict,
    ) -> None:

        # --------------------------------------------------
        # LIVE
        # --------------------------------------------------

        live_state = state.get("live")

        self.live = (
            EMAValue(**live_state)
            if live_state is not None
            else None
        )

        # --------------------------------------------------
        # HISTORY
        # --------------------------------------------------

        self.history = deque(
            (
                EMAValue(**value)
                for value in (
                    state.get("history") or []
                )
            ),
            maxlen=MAX_HISTORY,
        )

        # --------------------------------------------------
        # SEED
        # --------------------------------------------------

        self._seed_values = deque(
            (
                float(value)
                for value in (
                    state.get("seed_values") or []
                )
            ),
            maxlen=self.length,
        )

        # --------------------------------------------------
        # EMA STATE
        # --------------------------------------------------

        self._ema = (
            float(state["ema"])
            if state.get("ema") is not None
            else None
        )