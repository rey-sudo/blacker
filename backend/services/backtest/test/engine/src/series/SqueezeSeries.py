import math
from collections import deque
from dataclasses import asdict, dataclass
from series.series import Series
from ingestion.tick import Tick

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
        level: int,
        name: str,
        id: str,
        source: str,
        length: int = 20,
        mult: float = 2.0,
        lengthKC: int = 20,
        multKC: float = 1.5,
        useTrueRange: bool = True,
    ):
        super().__init__(level, name, id)

        self.source = source
        self.length = length
        self.mult = mult
        self.lengthKC = lengthKC
        self.multKC = multKC
        self.useTrueRange = useTrueRange

        # Buffer del tamaño estrictamente necesario para el cálculo
        self._buf_len = max(self.length, self.lengthKC)

        # Guarda un estado enriquecido de las velas confirmadas
        self._confirmed: deque[dict[str, float]] = deque(maxlen=self._buf_len)
        self._live_calc: dict[str, float] | None = None
        self._prev_momentum: float = 0.0

        # Precomputación de constantes para la Regresión Lineal (Acelera dramáticamente el O(N))
        self._x_mean = (self.lengthKC - 1) / 2.0
        self._xx = sum((i - self._x_mean)**2 for i in range(self.lengthKC))
        self._x_diff = [(i - self._x_mean) for i in range(self.lengthKC)]

        self._internal: Squeeze | None = None  # estado real, nunca suprimido
        self.live: Squeeze | None = None       # estado visible (None durante warm-up)

        self.history: deque[Squeeze] = deque(maxlen=MAX_HISTORY_LEN)

    def to_dict(self):
        return {
            "params": {
                "level": self.level,
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
                "live_calc": self._live_calc,
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
        self._live_calc = buffer.get("live_calc")
        self._prev_momentum = self._confirmed[-1]['mom'] if self._confirmed else 0.0

        # _internal se reconstruye desde live, o desde el último history
        self._internal = self.live or (self.history[-1] if self.history else None)

    def update(self, tick: Tick) -> None:
        source = self.timeframe.get_series(self.source)

        if source.live is None:
            return

        candle = source.live

        if self._internal is None:
            pass # Primera vela
        elif self._internal.start_ts == candle.start_ts:
            pass # Misma vela viva
        else:
            # Nueva vela: Consolidamos el estado anterior en el buffer confirmado
            if self._live_calc is not None:
                self._confirmed.append(self._live_calc)
                self._prev_momentum = self._live_calc['mom']
            self.history.append(self._internal)

        # ---------------------------------------------------------
        # CÁLCULO INCREMENTAL TICK A TICK (LIVE)
        # ---------------------------------------------------------
        
        # 1. True Range 
        if not self._confirmed:
            live_tr = candle.high - candle.low
        else:
            prev_close = self._confirmed[-1]['close']
            if self.useTrueRange:
                live_tr = max(
                    candle.high - candle.low,
                    abs(candle.high - prev_close),
                    abs(candle.low - prev_close)
                )
            else:
                live_tr = candle.high - candle.low

        # Helper para componer arrays limitados con valores confirmados + live
        def tail(key: str, length: int, live_val: float) -> list[float]:
            lst = [b[key] for b in self._confirmed]
            return lst[-(length - 1):] + [live_val] if length > 1 else [live_val]

        # 2. Bandas de Bollinger (BB)
        cur_closes = tail('close', self.length, candle.close)
        L_bb = len(cur_closes)
        basis = sum(cur_closes) / L_bb
        var = sum((x - basis) ** 2 for x in cur_closes) / L_bb
        dev = math.sqrt(var)

        upper_bb = basis + dev * self.mult
        lower_bb = basis - dev * self.mult

        # 3. Canales de Keltner (KC)
        cur_closes_kc = tail('close', self.lengthKC, candle.close)
        cur_trs_kc = tail('tr', self.lengthKC, live_tr)
        L_kc = len(cur_closes_kc)
        
        ma = sum(cur_closes_kc) / L_kc
        range_ma = sum(cur_trs_kc) / L_kc

        upper_kc = ma + range_ma * self.multKC
        lower_kc = ma - range_ma * self.multKC

        # 4. Condiciones de Squeeze
        squeeze_on = lower_bb > lower_kc and upper_bb < upper_kc
        squeeze_off = lower_bb < lower_kc and upper_bb > upper_kc
        no_squeeze = not squeeze_on and not squeeze_off

        if no_squeeze:
            squeeze_color = "#2962FF"
        elif squeeze_on:
            squeeze_color = "#000000"
        else:
            squeeze_color = "#808080"

        # 5. Momentum (Mid y Regresión Lineal)
        cur_highs_kc = tail('high', self.lengthKC, candle.high)
        cur_lows_kc = tail('low', self.lengthKC, candle.low)

        hh = max(cur_highs_kc)
        ll = min(cur_lows_kc)
        mid = ((hh + ll) / 2.0 + ma) / 2.0
        live_src = candle.close - mid

        cur_srcs = tail('src', self.lengthKC, live_src)
        L = len(cur_srcs)
        
        momentum_val = 0.0
        if L > 1:
            y_mean = sum(cur_srcs) / L
            if L == self.lengthKC and self._xx != 0:
                # Fast path precalculado (barras maduras)
                xy = sum(self._x_diff[i] * (cur_srcs[i] - y_mean) for i in range(L))
                slope = xy / self._xx
                momentum_val = y_mean - slope * self._x_mean + slope * (L - 1)
            else:
                # Fallback dinámico (durante el warm-up)
                x_mean = (L - 1) / 2.0
                xx = sum((i - x_mean) ** 2 for i in range(L))
                if xx != 0:
                    xy = sum((i - x_mean) * (cur_srcs[i] - y_mean) for i in range(L))
                    slope = xy / xx
                    momentum_val = y_mean - slope * x_mean + slope * (L - 1)
                else:
                    momentum_val = cur_srcs[-1]
        elif L == 1:
            momentum_val = cur_srcs[0]

        # 6. Color de Momentum
        prev = self._prev_momentum
        if not math.isfinite(momentum_val):
            color = "#00000000"
        elif momentum_val >= 0:
            color = "#00FF00" if momentum_val > prev else "#008000"
        else:
            color = "#FF0000" if momentum_val < prev else "#800000"

        # 7. Actualizamos estados temporales e internos
        self._live_calc = {
            'high': candle.high,
            'low': candle.low,
            'close': candle.close,
            'tr': live_tr,
            'src': live_src,
            'mom': momentum_val
        }

        self._internal = Squeeze(
            time=candle.time,
            start_ts=candle.start_ts,
            end_ts=candle.end_ts,
            upperBB=upper_bb,
            lowerBB=lower_bb,
            upperKC=upper_kc,
            lowerKC=lower_kc,
            sqzOn=squeeze_on,
            sqzOff=squeeze_off,
            noSqz=no_squeeze,
            val=momentum_val,
            bcolor=color,
            scolor=squeeze_color,
        )

        self.live = self._internal if math.isfinite(self._internal.val) else None