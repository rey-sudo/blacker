from collections import deque
from dataclasses import asdict, dataclass
from series.series import Series
from ingestion.tick import Tick

MAX_HISTORY_LEN = 500

@dataclass(frozen=True)
class Ema:
    time: int
    value: float
    start_ts: int
    end_ts: int

class EmaSeries(Series):
    def __init__(self, level:int, name: str, id: str, source: str, period: int):
        super().__init__(level, name, id)

        self.source = source
        self.period = period

        self._internal: Ema | None = None  # estado real, nunca suprimido
        self.live: Ema | None = None       # estado visible (None durante warm-up)

        self.history: deque[Ema] = deque(maxlen=MAX_HISTORY_LEN)
        
    def to_dict(self):
        return {
            "params": {
                "level": self.level,
                "name": self.name,
                "id": self.id,
                "source": self.source,
                "period": self.period,
            },
            "live": asdict(self.live) if self.live is not None else None,
            "history": [asdict(ema) for ema in self.history],
        }

    def set_state(self, state: dict) -> None:
        self.history = deque(
            (Ema(**ema) for ema in state["history"]),
            maxlen=MAX_HISTORY_LEN,
        )

        self.live = (
            Ema(**state["live"]) if state["live"] is not None else None
        )

        # _internal se reconstruye desde live, o desde el último history
        # si live está suprimido por warm-up
        self._internal = self.live or (self.history[-1] if self.history else None)

    def update(self, tick: Tick) -> None:
        source = self.timeframe.get_series(self.source)

        if source.live is None:
            return

        candle = source.live
        k = 2 / (self.period + 1)

        # ── Calcular valor interno (siempre, desde la primera vela) ──

        if self._internal is None:
            # Primera vela: seed
            value = candle.close

        elif self._internal.start_ts == candle.start_ts:
            # Misma vela viva: recalcular desde última confirmada
            previous = self.history[-1].value if self.history else self._internal.value
            value = candle.close * k + previous * (1 - k)

        else:
            # Nueva vela: confirmar la anterior en history
            self.history.append(self._internal)
            previous = self._internal.value
            value = candle.close * k + previous * (1 - k)

        self._internal = Ema(
            time=candle.time,
            value=value,
            start_ts=candle.start_ts,
            end_ts=candle.end_ts,
        )

        # ── Warm-up: solo exponer al exterior cuando hay suficiente historia ──
        if len(self.history) >= self.period - 1:
            self.live = self._internal
        else:
            self.live = None