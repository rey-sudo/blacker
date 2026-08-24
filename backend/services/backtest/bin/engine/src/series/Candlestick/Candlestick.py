from collections import deque
from dataclasses import asdict, dataclass
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
        params: dict,
        parent_id: str | None
    ):
        super().__init__(id, kind, level, params, parent_id)
        
        self._live: Candle | None = None
        self.history: deque[Candle] = deque(
            maxlen=MAX_HISTORY
        )
        self.is_new: bool = False
        self.last_bar_start_ts: int | None = None

    @property
    def live(self) -> Candle | None:
        return self._live

    @live.setter
    def live(self, value: Candle | None):
        self._live = value

    def update(self) -> None:
        """
        Actualiza la Candle usando la barra actual
        de su Timeframe.

        BarAggregator es quien construye la barra.
        Candlestick solamente la transforma a Candle.
        """

        bar = self._timeframe.live

        if bar is None:
            self.is_new = False
            return

        # --------------------------------------------------
        # Nueva barra del timeframe
        # --------------------------------------------------

        if (
            self.live is None
            or self.live.start_ts != bar.start_ts
        ):

            if self.live is not None:
                self.history.append(self.live)

            self.live = Candle(
                time=bar.time,

                open=bar.open,
                high=bar.high,
                low=bar.low,
                close=bar.close,

                volume=bar.total_volume,

                start_ts=bar.start_ts,
                end_ts=bar.end_ts,
            )

            self.is_new = True

        # --------------------------------------------------
        # Actualización de la barra actual
        # --------------------------------------------------

        else:

            self.live = Candle(
                time=bar.time,

                open=bar.open,
                high=bar.high,
                low=bar.low,
                close=bar.close,

                volume=bar.total_volume,

                start_ts=bar.start_ts,
                end_ts=bar.end_ts,
            )

            self.is_new = False

        self.last_bar_start_ts = bar.start_ts

    def flush(self) -> None:
        """
        Finaliza la Candle actual.
        """

        if self.live is not None:
            self.history.append(self.live)
            self.live = None

        self.is_new = False
        self.last_bar_start_ts = None

    def to_dict(self):
        return {
            "id": self.id,
            "kind": self.kind,
            "level": self.level,            
            "params": self.params,
            "parent_id": self.parent_id,

            #Extra
            "live": (
                asdict(self.live)
                if self.live
                else None
            ),
            "history": [
                asdict(candle)
                for candle in self.history
            ],
            "is_new": self.is_new,
            "last_bar_start_ts": self.last_bar_start_ts,
        }

    def set_state(self, state: dict) -> None:
        self.live = (
            Candle(**state.get("live"))
            if state.get("live") is not None
            else None
        )
        self.history = deque(
            (
                Candle(**candle)
                for candle in (state.get("history") or [])
            ),
            maxlen=MAX_HISTORY,
        )
        self.is_new = state.get("is_new")
        self.last_bar_start_ts = state.get("last_bar_start_ts")
        