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

import math
from series.series import Series
from ingestion.tick import Tick
from dataclasses import asdict, dataclass
from typing import Literal
from collections import deque

# Uso de slots=True para reducir footprint de memoria y agilizar acceso a atributos.
# Se retira frozen=True para permitir mutaciones in-place en la vela "Live".
@dataclass(slots=True)
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
    delta_vol: float
    signal: float
    bubble_color: Literal["green", "red", "gray"]
    bubble_size: float
    show_bubble: bool
    tick_count: int


_THRESHOLD = 0.05
MAX_HISTORY_LEN = 500
_VOL_PERCENTILE = 0.95


class CandleBubbleSeries(Series):
    """
    Aggregates market ticks into OHLCV candles enriched with
    order-flow bubble signals (buy/sell imbalance smoothed by EMA
    and weighted by relative volume).
    """

    def __init__(self, level: int, name: str, id: str, ema_span: int = 10, vol_window: int = 50):
        super().__init__(level, name, id)

        self.live: CandleBubble | None = None
        self.history: deque[CandleBubble] = deque(maxlen=MAX_HISTORY_LEN)
        self.is_new: bool = False

        self._ema_span = ema_span
        self._ema_alpha = 2.0 / (ema_span + 1)
        self._vol_window = vol_window

        # Estado interno
        self._ema: float | None = None
        
        # Deque para inserción/eliminación O(1)
        self._recent_volumes: deque[float] = deque(maxlen=vol_window)
        self._ref_vol: float = 1.0
        self._delta_history: deque[float] = deque(maxlen=vol_window)
        
        # Caché de cálculo intensivo (O(N)) para uso en tiempo real (O(1))
        self._cached_threshold: float = _THRESHOLD

    @property
    def live(self) -> CandleBubble | None:
        return self._live

    @live.setter
    def live(self, value: CandleBubble | None) -> None:
        self._live = value

    # ------------------------------------------------------------------
    # Serialization
    # ------------------------------------------------------------------

    def to_dict(self) -> dict:
        return {
            "params": {
                "level": self.level,
                "name": self.name,
                "id": self.id
            },
            "live": asdict(self.live) if self.live is not None and len(self.history) > 0 else None,
            "history": [asdict(c) for c in self.history],
            "is_new": self.is_new,
            "_ema": self._ema,
            "_recent_volumes": list(self._recent_volumes),
            "_max_vol": self._ref_vol,
            "_delta_history": list(self._delta_history),
            "_cached_threshold": self._cached_threshold,
        }

    def set_state(self, state: dict) -> None:
        self.live = (
            CandleBubble(**state["live"])
            if state["live"] is not None
            else None
        )

        self.history = deque(
            (CandleBubble(**c) for c in state["history"]),
            maxlen=MAX_HISTORY_LEN,
        )

        self.is_new = state["is_new"]
        self._ema = state["_ema"]
        
        self._recent_volumes = deque(
            state.get("_recent_volumes", []),
            maxlen=self._vol_window,
        )
        self._ref_vol = state.get("_ref_vol", state.get("_max_vol", 1.0))
        self._delta_history = deque(
            state.get("_delta_history", []),
            maxlen=self._vol_window,
        )
        self._cached_threshold = state.get("_cached_threshold", _THRESHOLD)

    # ------------------------------------------------------------------
    # Update
    # ------------------------------------------------------------------

    def update(self, tick: Tick) -> None:
        bucket = tick.time // self.timeframe_ms

        if self.live is None:
            self.live = self._new_candle(bucket, tick)
            self.is_new = True
            return

        live = self.live
        current_bucket = live.start_ts // self.timeframe_ms

        #
        # Cierre de vela
        #
        if bucket != current_bucket:
            # 1. Actualizar ventana de volúmenes (deque maneja el maxlen automáticamente)
            self._recent_volumes.append(live.volume)
            self._ref_vol = _percentile_vol(self._recent_volumes, _VOL_PERCENTILE)
            self._delta_history.append(live.delta_pct)

            # 2. Actualizar umbral adaptativo SOLO al cierre de la vela (Evita O(N) por tick)
            self._cached_threshold = self._calc_adaptive_threshold()

            # 3. Actualizar EMA persistente
            self._ema = self._next_ema(live.delta_pct)

            # 4. Sellar vela visualmente usando factor de madurez 1.0
            _update_bubble_properties(
                live, self._ema, live.volume, self._ref_vol, 1.0, self._cached_threshold
            )
            self.history.append(live)

            # 5. Abrir nueva vela
            self.live = self._new_candle(bucket, tick)
            self.is_new = True
            return

        #
        # Actualización de vela viva (Live) - Operaciones in-place hiperoptimizadas
        #
        
        # Evaluar boolean condicional solo una vez
        if tick.is_buyer_maker:
            sell_qty_tick = tick.qty
            buy_qty_tick = 0.0
        else:
            buy_qty_tick = tick.qty
            sell_qty_tick = 0.0
            
        # Mutación directa sobre el objeto existente (Zero-allocation)
        live.buy_qty += buy_qty_tick
        live.sell_qty += sell_qty_tick
        live.volume += tick.qty
        live.tick_count += 1
        
        if tick.price > live.high:
            live.high = tick.price
        if tick.price < live.low:
            live.low = tick.price
        live.close = tick.price

        live.delta_pct = _delta_pct(live.buy_qty, live.sell_qty)
        live.delta_vol = live.buy_qty - live.sell_qty

        # Señal preview (Lectura sin mutar EMA)
        preview_signal = self._next_ema(live.delta_pct)
        preview_ref_vol = self._ref_vol if self._ref_vol > live.volume else live.volume
        maturity = _maturity_factor(live.tick_count, self._ema_span)

        # Actualización visual in-place
        _update_bubble_properties(
            live, preview_signal, live.volume, preview_ref_vol, maturity, self._cached_threshold
        )

        self.is_new = False

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    def _new_candle(self, bucket: int, tick: Tick) -> CandleBubble:
        if tick.is_buyer_maker:
            sell_qty = tick.qty
            buy_qty = 0.0
        else:
            buy_qty = tick.qty
            sell_qty = 0.0
            
        delta_pct = _delta_pct(buy_qty, sell_qty)
        signal = self._next_ema(delta_pct)

        start_ts = bucket * self.timeframe_ms
        current_vol = tick.qty
        preview_ref_vol = self._ref_vol if self._ref_vol > current_vol else current_vol
        maturity = _maturity_factor(1, self._ema_span)

        # Inicializa base vacía temporalmente para la burbuja, luego inyecta propiedades reales
        candle = CandleBubble(
            time=start_ts // 1000,
            open=tick.price,
            high=tick.price,
            low=tick.price,
            close=tick.price,
            volume=current_vol,
            start_ts=start_ts,
            end_ts=(bucket + 1) * self.timeframe_ms,
            buy_qty=buy_qty,
            sell_qty=sell_qty,
            delta_pct=delta_pct,
            delta_vol=buy_qty - sell_qty,
            tick_count=1,
            # Placeholders que serán sobreescritos por _update_bubble_properties
            signal=0.0,
            bubble_color="gray",
            bubble_size=0.0,
            show_bubble=True 
        )
        
        _update_bubble_properties(
            candle, signal, current_vol, preview_ref_vol, maturity, self._cached_threshold
        )
        return candle

    def _next_ema(self, value: float) -> float:
        """Devuelve la EMA actualizada SIN mutar el estado interno."""
        if self._ema is None:
            return value
        return self._ema_alpha * value + (1.0 - self._ema_alpha) * self._ema

    def _calc_adaptive_threshold(self) -> float:
        """
        Calcula el threshold dinámico. Solo se ejecuta al cierre de vela.
        """
        history_len = len(self._delta_history)
        if history_len < 5:
            return _THRESHOLD
            
        mean = sum(self._delta_history) / history_len
        variance = sum((x - mean) ** 2 for x in self._delta_history) / history_len
        return max(math.sqrt(variance) * 0.5, 0.01)


# ------------------------------------------------------------------
# Pure functions / Utils
# ------------------------------------------------------------------

def _delta_pct(buy_qty: float, sell_qty: float) -> float:
    total = buy_qty + sell_qty
    return (buy_qty - sell_qty) / total if total > 0.0 else 0.0


def _percentile_vol(volumes: deque[float], p: float) -> float:
    if not volumes:
        return 1.0
    
    # sorted() en Python utiliza Timsort (implementado en C), 
    # es extremadamente rápido con colecciones pequeñas (ej. 50 items)
    sorted_vols = sorted(volumes)
    idx = max(0, int(math.ceil(p * len(sorted_vols))) - 1)
    return max(sorted_vols[idx], 1e-9)


def _maturity_factor(tick_count: int, ema_span: int) -> float:
    if tick_count >= ema_span:
        return 1.0
    return math.sqrt(tick_count / ema_span)


def _update_bubble_properties(
    candle: CandleBubble,
    signal: float,
    volume: float,
    ref_vol: float,
    maturity: float,
    threshold: float
) -> None:
    """
    Mutador in-place: Evita instanciar diccionarios y desempaquetar parámetros (*kwargs) 
    durante el stream masivo de ticks.
    """
    effective_signal = signal * maturity
    is_significant = abs(effective_signal) > threshold

    candle.signal = signal
    candle.show_bubble = True

    vol_ratio = math.tanh(volume / ref_vol) if ref_vol > 0.0 else 0.0

    if not is_significant:
        candle.bubble_color = "gray"
        candle.bubble_size = round(6.0 + (30.0 * vol_ratio), 2)
    else:
        candle.bubble_color = "green" if effective_signal > 0 else "red"
        impact = math.sqrt(abs(effective_signal) * vol_ratio)
        candle.bubble_size = round(15.0 + (80.0 * impact), 2)