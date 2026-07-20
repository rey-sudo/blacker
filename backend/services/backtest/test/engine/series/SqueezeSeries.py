import math
from collections import deque
from dataclasses import asdict, dataclass
from series.series import Series
from ingestion.tick import Tick
from .squeeze_momentum import (calculate_squeeze_momentum)

MAX_HISTORY_LEN = 500


@dataclass(frozen=True)
class Squeeze:
    time: int
    start_ts: int
    end_ts: int
    upperBB: float
    lowerBB: float
    upperKC: float
    lowerKC: float
    sqzOn: bool
    sqzOff: bool
    noSqz: bool
    val: float
    bcolor: str
    scolor: str


class SqueezeSeries(Series):
    def __init__(
        self,
        name: str,
        id: str,
        source: str,
        length: int = 20,
        mult: float = 2.0,
        lengthKC: int = 20,
        multKC: float = 1.5,
        useTrueRange: bool = True,
    ):
        super().__init__(name, id)

        self.source = source
        self.length = length
        self.mult = mult
        self.lengthKC = lengthKC
        self.multKC = multKC
        self.useTrueRange = useTrueRange

        # Barras necesarias para que `val` sea exacto (ver docstring de la
        # clase) + margen de seguridad.
        self._buf_len = max(self.length, 2 * self.lengthKC - 1) + 5

        self._confirmed: deque[dict[str, float]] = deque(maxlen=self._buf_len)
        self._live_bar: dict[str, float] | None = None

        self._internal: Squeeze | None = None  # estado real, nunca suprimido
        self.live: Squeeze | None = None       # estado visible (None durante warm-up)

        self.history: deque[Squeeze] = deque(maxlen=MAX_HISTORY_LEN)

    def to_dict(self):
        return {
            "params": {
                "name": self.name,
                "id": self.id,
                "source": self.source,
                "length": self.length,
                "mult": self.mult,
                "lengthKC": self.lengthKC,
                "multKC": self.multKC,
                "useTrueRange": self.useTrueRange,
            },
            "live": asdict(self.live) if self.live is not None else None,
            "history": [asdict(sq) for sq in self.history],
            "buffer": {
                "confirmed": list(self._confirmed),
                "live_bar": self._live_bar,
            },
        }

    def set_state(self, state: dict) -> None:
        self.history = deque(
            (Squeeze(**sq) for sq in state["history"]),
            maxlen=MAX_HISTORY_LEN,
        )

        self.live = (
            Squeeze(**state["live"]) if state["live"] is not None else None
        )

        buffer = state.get("buffer", {})
        self._confirmed = deque(
            buffer.get("confirmed", []),
            maxlen=self._buf_len,
        )
        self._live_bar = buffer.get("live_bar")

        # _internal se reconstruye desde live, o desde el último history
        # si live está suprimido por warm-up (mismo criterio que EmaSeries)
        self._internal = self.live or (self.history[-1] if self.history else None)

    def update(self, tick: Tick) -> None:
        source = self.timeframe.get_series(self.source)

        if source.live is None:
            return

        candle = source.live
        bar = {"high": candle.high, "low": candle.low, "close": candle.close}

        if self._internal is None:
            # Primera vela: todavía no hay nada que confirmar
            pass

        elif self._internal.start_ts == candle.start_ts:
            # Misma vela viva: se reemplaza el bar vivo, nada se confirma
            pass

        else:
            # Nueva vela: la vela viva anterior queda confirmada
            if self._live_bar is not None:
                self._confirmed.append(self._live_bar)
            self.history.append(self._internal)

        self._live_bar = bar

        window = list(self._confirmed) + [self._live_bar]

        high = [b["high"] for b in window]
        low = [b["low"] for b in window]
        close = [b["close"] for b in window]

        result = calculate_squeeze_momentum(
            high=high,
            low=low,
            close=close,
            length=self.length,
            mult=self.mult,
            length_kc=self.lengthKC,
            mult_kc=self.multKC,
            use_true_range=self.useTrueRange,
        )

        row = result[-1]

        self._internal = Squeeze(
            time=candle.time,
            start_ts=candle.start_ts,
            end_ts=candle.end_ts,
            upperBB=row["upperBB"],
            lowerBB=row["lowerBB"],
            upperKC=row["upperKC"],
            lowerKC=row["lowerKC"],
            sqzOn=row["squeezeOn"],
            sqzOff=row["squeezeOff"],
            noSqz=row["noSqueeze"],
            val=row["value"],
            bcolor=row["color"],
            scolor=row["squeezeColor"],
        )

        self.live = self._internal if math.isfinite(self._internal.val) else None        