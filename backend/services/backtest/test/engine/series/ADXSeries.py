from collections import deque
from dataclasses import asdict, dataclass
from series.series import Series
from ingestion.tick import Tick

MAX_HISTORY_LEN = 500


@dataclass(frozen=True)
class Adx:
    time: int
    adx: float
    plus_di: float
    minus_di: float
    reversal: bool
    start_ts: int
    end_ts: int


class ADXSeries(Series):

    def __init__(self, name: str, id: str, source: str, di_period: int, adx_period: int, key_level: float = 23.0):
        super().__init__(name, id)

        self.source = source
        self.di_period = di_period      # «dilen» 
        self.adx_period = adx_period    # «adxlen»
        self.key_level = key_level      # «keyLevel»  (default 23)

        # ── RMA accumulators para dilen ──────────────────────────────────────
        self._rma_tr:    float | None = None   # rma(tr,   dilen)
        self._rma_plus:  float | None = None   # rma(+DM,  dilen)
        self._rma_minus: float | None = None   # rma(-DM,  dilen)

        # ── RMA accumulator para adxlen ──────────────────────────────────────
        self._rma_dx:    float | None = None   # rma(dx,   adxlen)

        # ── Precio anterior (necesario para change()) ────────────────────────
        self._prev_high: float | None = None
        self._prev_low:  float | None = None
        self._prev_close: float | None = None

        # ── Contadores de muestras confirmadas ──────────────────────────────
        self._di_samples:  int = 0   # velas confirmadas en las RMAs de dilen
        self._adx_samples: int = 0   # valores de DX confirmados en rma_dx

        # ── Estado de la vela activa (no confirmada) ─────────────────────────
        self._current_start_ts: int | None = None

        # RMA «live» (sin confirmar) — se recalculan en cada tick
        self._live_rma_tr:    float | None = None
        self._live_rma_plus:  float | None = None
        self._live_rma_minus: float | None = None
        self._live_rma_dx:    float | None = None

        # ── Salida pública ────────────────────────────────────────────────────
        self._internal: Adx | None = None
        self.live:      Adx | None = None

        self.history: deque[Adx] = deque(maxlen=MAX_HISTORY_LEN)

    # ─────────────────────────────────────────────────────────────────────────
    # Serialización
    # ─────────────────────────────────────────────────────────────────────────

    def to_dict(self) -> dict:
        return {
            "params": {
                "name": self.name,
                "id": self.id,
                "source": self.source,
                "di_period": self.di_period,
                "adx_period": self.adx_period,
                "key_level": self.key_level,
            },
            "state": {
                "rma_tr":    self._rma_tr,
                "rma_plus":  self._rma_plus,
                "rma_minus": self._rma_minus,
                "rma_dx":    self._rma_dx,
                "prev_high":  self._prev_high,
                "prev_low":   self._prev_low,
                "prev_close": self._prev_close,
                "di_samples":  self._di_samples,
                "adx_samples": self._adx_samples,
                "current_start_ts": self._current_start_ts,
            },
            "live": asdict(self.live) if self.live is not None else None,
            "history": [asdict(a) for a in self.history],
        }

    def set_state(self, state: dict) -> None:
        s = state["state"]
        self._rma_tr    = s["rma_tr"]
        self._rma_plus  = s["rma_plus"]
        self._rma_minus = s["rma_minus"]
        self._rma_dx    = s["rma_dx"]
        self._prev_high  = s["prev_high"]
        self._prev_low   = s["prev_low"]
        self._prev_close = s["prev_close"]
        self._di_samples  = s["di_samples"]
        self._adx_samples = s["adx_samples"]
        self._current_start_ts = s["current_start_ts"]

        self.history = deque(
            (Adx(**a) for a in state["history"]),
            maxlen=MAX_HISTORY_LEN,
        )
        self.live = Adx(**state["live"]) if state["live"] is not None else None
        self._internal = self.live or (self.history[-1] if self.history else None)

        # Los live-RMAs se recalcularán en el próximo tick; iniciar desde
        # los valores confirmados para que el primer tick sea coherente.
        self._live_rma_tr    = self._rma_tr
        self._live_rma_plus  = self._rma_plus
        self._live_rma_minus = self._rma_minus
        self._live_rma_dx    = self._rma_dx

    # ─────────────────────────────────────────────────────────────────────────
    # Helpers
    # ─────────────────────────────────────────────────────────────────────────

    @staticmethod
    def _rma_step(prev: float | None, value: float, n: int) -> float:
        """Un paso de Wilder's RMA."""
        if prev is None:
            return value          # seed: primera muestra
        return (prev * (n - 1) + value) / n

    def _compute_di_components(
        self,
        high: float, low: float, close: float,
        rma_tr: float | None, rma_plus: float | None, rma_minus: float | None,
    ) -> tuple[float, float, float]:
        """
        Devuelve (new_rma_tr, new_rma_plus, new_rma_minus) dado el estado
        de las RMAs de entrada y los OHLC actuales + el cierre anterior.
        """
        n = self.di_period

        # True Range
        if self._prev_close is None:
            tr = high - low
        else:
            tr = max(high - low,
                     abs(high - self._prev_close),
                     abs(low  - self._prev_close))

        # Directional Movement
        # ta.change(high) devuelve `na` en la primera barra (bar_index=0),
        # por lo que ta.rma ignora ese valor y no avanza el seed.
        # no alimentamos rma_plus / rma_minus (quedan en None hasta barra 2).
        if self._prev_high is None:
            new_rma_tr    = self._rma_step(rma_tr, tr, n)
            new_rma_plus  = rma_plus   # None — aún sin seed
            new_rma_minus = rma_minus  # None — aún sin seed
        else:
            up   = high - self._prev_high
            down = self._prev_low - low

            plus_dm  = up   if (up > down and up > 0)   else 0.0
            minus_dm = down if (down > up and down > 0) else 0.0

            new_rma_tr    = self._rma_step(rma_tr,    tr,       n)
            new_rma_plus  = self._rma_step(rma_plus,  plus_dm,  n)
            new_rma_minus = self._rma_step(rma_minus, minus_dm, n)

        return new_rma_tr, new_rma_plus, new_rma_minus

    @staticmethod
    def _di_from_rmas(
        rma_tr: float | None, rma_plus: float | None, rma_minus: float | None
    ) -> tuple[float, float]:
        """Convierte RMAs crudas a +DI / -DI (%).
        Devuelve (0, 0) si algún acumulador aún no tiene seed (primera barra)."""
        if not rma_tr or rma_plus is None or rma_minus is None:
            return 0.0, 0.0
        plus_di  = 100 * rma_plus  / rma_tr
        minus_di = 100 * rma_minus / rma_tr
        return plus_di, minus_di

    @staticmethod
    def _dx(plus_di: float, minus_di: float) -> float:
        """DX = 100 * |+DI - -DI| / (+DI + -DI)."""
        total = plus_di + minus_di
        if total == 0:
            return 0.0
        return 100 * abs(plus_di - minus_di) / total

    # ─────────────────────────────────────────────────────────────────────────
    # Update principal
    # ─────────────────────────────────────────────────────────────────────────

    def update(self, tick: Tick) -> None:
        source = self.timeframe.get_series(self.source)

        if source.live is None:
            return

        candle = source.live
        new_candle = (self._current_start_ts != candle.start_ts)

        # ── Cuando empieza una vela nueva, confirmar la anterior ─────────────
        if new_candle and self._current_start_ts is not None:
            # Promover live-RMAs → confirmed-RMAs
            self._rma_tr    = self._live_rma_tr
            self._rma_plus  = self._live_rma_plus
            self._rma_minus = self._live_rma_minus
            self._di_samples += 1

            # Calcular DX confirmado y avanzar rma_dx
            plus_di, minus_di = self._di_from_rmas(
                self._rma_tr, self._rma_plus, self._rma_minus  # type: ignore[arg-type]
            )
            dx = self._dx(plus_di, minus_di)
            self._rma_dx = self._rma_step(self._rma_dx, dx, self.adx_period)
            self._adx_samples += 1

            # Actualizar precios anteriores (cierre de la vela confirmada)
            self._prev_high  = self._live_high
            self._prev_low   = self._live_low
            self._prev_close = self._live_close

            # Confirmar _internal → history
            if self._internal is not None:
                self.history.append(self._internal)

            self._current_start_ts = candle.start_ts

        elif self._current_start_ts is None:
            # Primera vela que procesamos
            self._current_start_ts = candle.start_ts

        # ── Guardar OHLC live para confirmar en el próximo cambio de vela ───
        self._live_high  = candle.high
        self._live_low   = candle.low
        self._live_close = candle.close

        # ── Calcular live-RMAs (desde las confirmadas, sin mutarlas) ─────────
        self._live_rma_tr, self._live_rma_plus, self._live_rma_minus = (
            self._compute_di_components(
                candle.high, candle.low, candle.close,
                self._rma_tr, self._rma_plus, self._rma_minus,
            )
        )

        plus_di, minus_di = self._di_from_rmas(
            self._live_rma_tr, self._live_rma_plus, self._live_rma_minus
        )
        dx_live = self._dx(plus_di, minus_di)
        self._live_rma_dx = self._rma_step(self._rma_dx, dx_live, self.adx_period)

        adx_value = self._live_rma_dx

        # rule1 = sig  < sig[1]          → ADX actual  < ADX anterior (history[-1])
        # rule2 = sig[1] > sig[2]        → ADX anterior > ADX antepenúltimo (history[-2])
        # rule3 = sig[1] > keyLevel
        # is_reversal = rule1 and rule2 and rule3
        reversal = False
        if len(self.history) >= 2 and adx_value is not None:
            sig_1 = self.history[-1].adx   # vela anterior confirmada
            sig_2 = self.history[-2].adx   # vela dos atrás confirmada
            reversal = (
                adx_value < sig_1
                and sig_1 > sig_2
                and sig_1 > self.key_level
            )

        # ── Construir _internal ──────────────────────────────────────────────
        self._internal = Adx(
            time=candle.time,
            adx=adx_value,
            plus_di=plus_di,
            minus_di=minus_di,
            reversal=reversal,
            start_ts=candle.start_ts,
            end_ts=candle.end_ts,
        )

        # ── Warm-up: exponer solo cuando hay suficientes muestras ────────────
        # Necesitamos di_period muestras confirmadas para las DI-RMAs
        # y adx_period muestras de DX para la ADX-RMA.
        min_confirmed = max(self.di_period, self.adx_period)
        if self._adx_samples >= min_confirmed:
            self.live = self._internal
        else:
            self.live = None