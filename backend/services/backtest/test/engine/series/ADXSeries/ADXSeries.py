from collections import deque
from dataclasses import asdict, dataclass
from series.series import Series
from ingestion.tick import Tick

MAX_HISTORY_LEN = 500

@dataclass(frozen=True)
class Adx:
    time: int
    start_ts: int
    end_ts: int

    # ── Salida pública (equivalente a las columnas del DataFrame de adx.py) ──
    adx: float
    plus_di: float
    minus_di: float
    adx_color: str
    is_reversal: bool
    reversal_level: float | None

    # ── Estado interno de continuidad (necesario para calcular el siguiente valor) ──
    high: float
    low: float
    close: float
    tr_rma: float
    plus_dm_rma: float
    minus_dm_rma: float

class ADXSeries(Series):
    def __init__(self, level: int, name: str, id: str, source: str,
                 dilen: int = 14, adxlen: int = 14, key_level: float = 23):
        super().__init__(level, name, id)

        self.source = source
        self.dilen = dilen
        self.adxlen = adxlen
        self.key_level = key_level

        self._internal: Adx | None = None  # estado real, nunca suprimido
        self.live: Adx | None = None       # estado visible (None durante warm-up)

        self.history: deque[Adx] = deque(maxlen=MAX_HISTORY_LEN)

    def to_dict(self):
        return {
            "params": {
                "level": self.level,
                "name": self.name,
                "id": self.id,
                "source": self.source,
                "dilen": self.dilen,
                "adxlen": self.adxlen,
                "key_level": self.key_level,
            },
            "live": asdict(self.live) if self.live is not None else None,
            "history": [asdict(a) for a in self.history],
        }

    def set_state(self, state: dict) -> None:
        self.history = deque(
            (Adx(**a) for a in state["history"]),
            maxlen=MAX_HISTORY_LEN,
        )

        self.live = (
            Adx(**state["live"]) if state["live"] is not None else None
        )

        # _internal se reconstruye desde live, o desde el último history
        # si live está suprimido por warm-up
        self._internal = self.live or (self.history[-1] if self.history else None)

    def update(self, tick: Tick) -> None:
        source = self.timeframe.get_series(self.source)

        if source.live is None:
            return

        candle = source.live

        # ── Referencia previa para continuar las RMA (TR, +DM, -DM) ──

        if self._internal is None:
            # Primera vela: no hay vela anterior con la que calcular diffs/true range
            prev_chain = None

        elif self._internal.start_ts == candle.start_ts:
            # Misma vela viva: recalcular desde la última confirmada
            prev_chain = self.history[-1] if self.history else self._internal

        else:
            # Nueva vela: confirmar la anterior en history
            self.history.append(self._internal)
            prev_chain = self._internal  # == self.history[-1] tras el append

        # Las dos últimas velas CONFIRMADAS: usadas para color y reglas de reversión,
        # que en adx.py son sig.shift(1) / sig.shift(2)
        prev1 = self.history[-1] if len(self.history) >= 1 else None
        prev2 = self.history[-2] if len(self.history) >= 2 else None

        self._internal = self._compute_step(candle, prev_chain, prev1, prev2)

        # ── Warm-up: ADX necesita dilen + adxlen - 1 velas confirmadas ──
        # (misma convención de lookback que usa TA-Lib para el ADX)
        if len(self.history) >= self.dilen + self.adxlen - 1:
            self.live = self._internal
        else:
            self.live = None

    def _compute_step(self, candle, prev_chain: "Adx | None",
                       prev1: "Adx | None", prev2: "Adx | None") -> "Adx":
        di_alpha = 1 / self.dilen
        adx_alpha = 1 / self.adxlen

        if prev_chain is None:
            # Sin vela anterior no hay close previo (true range direccional)
            # ni high/low previos (movimiento direccional)
            tr = candle.high - candle.low
            plus_dm = 0.0
            minus_dm = 0.0

            tr_rma = tr
            plus_dm_rma = plus_dm
            minus_dm_rma = minus_dm
        else:
            up = candle.high - prev_chain.high
            down = prev_chain.low - candle.low

            plus_dm = up if (up > down and up > 0) else 0.0
            minus_dm = down if (down > up and down > 0) else 0.0

            tr = max(
                candle.high - candle.low,
                abs(candle.high - prev_chain.close),
                abs(candle.low - prev_chain.close),
            )

            tr_rma = tr * di_alpha + prev_chain.tr_rma * (1 - di_alpha)
            plus_dm_rma = plus_dm * di_alpha + prev_chain.plus_dm_rma * (1 - di_alpha)
            minus_dm_rma = minus_dm * di_alpha + prev_chain.minus_dm_rma * (1 - di_alpha)

        # +DI / -DI (con guarda ante división por cero: adx.py no la tiene porque
        # pandas devuelve NaN/inf en vez de lanzar una excepción)
        plus_di = 100 * plus_dm_rma / tr_rma if tr_rma != 0 else 0.0
        minus_di = 100 * minus_dm_rma / tr_rma if tr_rma != 0 else 0.0

        summ = plus_di + minus_di
        divisor = summ if summ != 0 else 1.0
        dx = abs(plus_di - minus_di) / divisor

        if prev1 is None:
            adx_value = 100 * dx
        else:
            adx_value = (100 * dx) * adx_alpha + prev1.adx * (1 - adx_alpha)

        adx_color = "lime" if (prev1 is not None and adx_value > prev1.adx) else "red"

        if prev1 is not None and prev2 is not None:
            rule1 = adx_value < prev1.adx
            rule2 = prev1.adx > prev2.adx
            rule3 = prev1.adx > self.key_level
            is_reversal = rule1 and rule2 and rule3
        else:
            is_reversal = False

        reversal_level = prev1.adx if (is_reversal and prev1 is not None) else None

        return Adx(
            time=candle.time,
            start_ts=candle.start_ts,
            end_ts=candle.end_ts,
            adx=adx_value,
            plus_di=plus_di,
            minus_di=minus_di,
            adx_color=adx_color,
            is_reversal=is_reversal,
            reversal_level=reversal_level,
            high=candle.high,
            low=candle.low,
            close=candle.close,
            tr_rma=tr_rma,
            plus_dm_rma=plus_dm_rma,
            minus_dm_rma=minus_dm_rma,
        )