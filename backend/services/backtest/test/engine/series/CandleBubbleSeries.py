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

@dataclass(frozen=True)
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

# Percentil robusto: ignora el top-5% de spikes de volumen para que
# un único evento anómalo no colapse la escala visual.
_VOL_PERCENTILE = 0.95


class CandleBubbleSeries(Series):
    """
    Aggregates market ticks into OHLCV candles enriched with
    order-flow bubble signals (buy/sell imbalance smoothed by EMA
    and weighted by relative volume).
    """

    def __init__(self, name:str, id:str,  ema_span: int = 10, vol_window: int = 50):
        super().__init__(name, id)

        self.live: CandleBubble | None = None
        self.history: deque[CandleBubble] = deque(maxlen=MAX_HISTORY_LEN)
        self.is_new: bool = False

        self._ema_span = ema_span
        self._ema_alpha = 2 / (ema_span + 1)
        self._vol_window = vol_window

        # Estado interno
        self._ema: float | None = None
        self._recent_volumes: list[float] = []
        # Referencia de volumen robusta: percentil en lugar de max puro
        self._ref_vol: float = 1.0
        self._delta_history: deque[float] = deque(maxlen=vol_window)  

    # ------------------------------------------------------------------
    # Serialization
    # ------------------------------------------------------------------

    def to_dict(self) -> dict:
        return {
            "params": {
                "name": self.name,
                "id": self.id
            },
            "live": asdict(self.live) if self.live is not None and len(self.history) > 0 else None,
            "history": [asdict(c) for c in self.history],
            "is_new": self.is_new,
            "_ema": self._ema,
            "_recent_volumes": self._recent_volumes,
            # Backward-compat: guardamos como _max_vol para no romper estados serializados existentes
            "_max_vol": self._ref_vol,
            "_delta_history": list(self._delta_history),  
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
        self._recent_volumes = state.get("_recent_volumes", [])
        # Soporta estados serializados bajo el nombre antiguo _max_vol
        self._ref_vol = state.get("_ref_vol", state.get("_max_vol", 1.0))
        self._delta_history = deque(                          
            state.get("_delta_history", []),
            maxlen=self._vol_window,
        )

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
            # 1. Actualizar ventana de volúmenes ANTES de la EMA para que
            #    _ref_vol esté disponible al sellar la señal visual.
            self._recent_volumes.append(live.volume)
            if len(self._recent_volumes) > self._vol_window:
                self._recent_volumes.pop(0)
            self._ref_vol = _percentile_vol(self._recent_volumes, _VOL_PERCENTILE)
            self._delta_history.append(live.delta_pct)       

            # 2. Actualizar EMA con el delta_pct FINAL de la vela cerrada.
            #    (Se hace después del vol para no contaminar señales previas.)
            self._ema = self._next_ema(live.delta_pct)

            # 3. Sellar vela con señal y escala visual actualizadas.
            closed = self._apply_signal(live, self._ema, self._ref_vol,
                                        threshold=self._adaptive_threshold()) 
            self.history.append(closed)

            # 4. Abrir nueva vela
            self.live = self._new_candle(bucket, tick)
            self.is_new = True
            return

        #
        # Actualización de vela viva (Live)
        #
        new_buy_qty  = live.buy_qty  + (0.0 if tick.is_buyer_maker else tick.qty)
        new_sell_qty = live.sell_qty + (tick.qty if tick.is_buyer_maker else 0.0)

        delta_pct = _delta_pct(new_buy_qty, new_sell_qty)

        # Señal preview: incorpora el delta actual SIN modificar la EMA persistente.
        # Esto da una lectura en tiempo real precisa en lugar de usar la EMA del cierre anterior.
        preview_signal = self._next_ema(delta_pct)

        current_vol = live.volume + tick.qty

        # Para la vista viva usamos _ref_vol histórico; si la vela actual ya supera
        # ese umbral la normalizamos contra sí misma (vol_ratio → 1.0 máximo honesto).
        preview_ref_vol = max(self._ref_vol, current_vol)

        # Confianza mínima: burbujas durante los primeros ticks tienen alta varianza.
        # Aplicamos un factor de madurez que sube de 0 → 1 en los primeros tick_count ticks.
        maturity = _maturity_factor(live.tick_count + 1, self._ema_span)

        self.live = CandleBubble(
            time=live.start_ts // 1000,
            open=live.open,
            high=max(live.high, tick.price),
            low=min(live.low, tick.price),
            close=tick.price,
            volume=current_vol,
            start_ts=live.start_ts,
            end_ts=live.end_ts,
            buy_qty=new_buy_qty,
            sell_qty=new_sell_qty,
            delta_pct=delta_pct,
            delta_vol=new_buy_qty - new_sell_qty,
            tick_count=live.tick_count + 1,
            **_bubble_fields(preview_signal, current_vol, preview_ref_vol, maturity,
                             threshold=self._adaptive_threshold()),  
        )

        self.is_new = False

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    def _new_candle(self, bucket: int, tick: Tick) -> CandleBubble:
        buy_qty  = 0.0 if tick.is_buyer_maker else tick.qty
        sell_qty = tick.qty if tick.is_buyer_maker else 0.0
        delta_pct = _delta_pct(buy_qty, sell_qty)

        # Primera señal de la vela: si hay EMA histórica la usamos directamente
        # (sin actualizarla, eso ocurre solo al cerrar una vela).
        signal = self._next_ema(delta_pct)

        start_ts = bucket * self.timeframe_ms
        current_vol = tick.qty
        preview_ref_vol = max(self._ref_vol, current_vol)

        # Primer tick: madurez mínima → burbuja muy atenuada.
        maturity = _maturity_factor(1, self._ema_span)

        return CandleBubble(
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
            **_bubble_fields(signal, current_vol, preview_ref_vol, maturity,
                             threshold=self._adaptive_threshold()), 
        )

    def _next_ema(self, value: float) -> float:
        """Devuelve la EMA actualizada SIN mutar el estado interno."""
        if self._ema is None:
            return value
        return self._ema_alpha * value + (1 - self._ema_alpha) * self._ema

    def _adaptive_threshold(self) -> float:                 
        """
        Threshold dinámico basado en la desviación estándar reciente de delta_pct.
        En timeframes altos (4h, 1d) el imbalance converge a 0 por volumen,
        así que el umbral se ajusta al rango real del mercado en ese timeframe.
        """
        if len(self._delta_history) < 5:
            return _THRESHOLD  # fallback estático hasta tener muestra suficiente
        mean = sum(self._delta_history) / len(self._delta_history)
        variance = sum((x - mean) ** 2 for x in self._delta_history) / len(self._delta_history)
        std = math.sqrt(variance)
        return max(std * 0.5, 0.01)  # mínimo 1% para evitar over-señalización

    @staticmethod
    def _apply_signal(
        candle: CandleBubble,
        signal: float,
        ref_vol: float,
        threshold: float = _THRESHOLD,             
    ) -> CandleBubble:
        # Al sellar una vela cerrada la madurez es completa (factor = 1.0)
        return CandleBubble(
            time=candle.time,
            open=candle.open,
            high=candle.high,
            low=candle.low,
            close=candle.close,
            volume=candle.volume,
            start_ts=candle.start_ts,
            end_ts=candle.end_ts,
            buy_qty=candle.buy_qty,
            sell_qty=candle.sell_qty,
            delta_pct=candle.delta_pct,
            delta_vol=candle.delta_vol,
            tick_count=candle.tick_count,
            **_bubble_fields(signal, candle.volume, ref_vol, maturity=1.0,
                             threshold=threshold),   
        )


# ------------------------------------------------------------------
# Pure functions
# ------------------------------------------------------------------

def _delta_pct(buy_qty: float, sell_qty: float) -> float:
    total = buy_qty + sell_qty
    return (buy_qty - sell_qty) / total if total > 0.0 else 0.0


def _percentile_vol(volumes: list[float], p: float) -> float:
    """
    Devuelve el percentil p (0–1) de la lista de volúmenes.
    Más robusto que el máximo puro: ignora spikes extremos.
    Si la lista está vacía, devuelve 1.0 para evitar división por cero.
    """
    if not volumes:
        return 1.0
    sorted_vols = sorted(volumes)
    idx = max(0, int(math.ceil(p * len(sorted_vols))) - 1)
    return max(sorted_vols[idx], 1e-9)


def _maturity_factor(tick_count: int, ema_span: int) -> float:
    """
    Factor 0→1 que sube suavemente durante los primeros `ema_span` ticks.
    Atenúa burbujas ruidosas al inicio de una vela donde el sample size es bajo.
    Usa una curva sigmoide suave: llega a ~0.88 en ema_span ticks.
    """
    if tick_count >= ema_span:
        return 1.0
    # raíz cuadrada: sube rápido al inicio y se aplana al acercarse a ema_span
    return math.sqrt(tick_count / ema_span)


def _bubble_fields(
    signal: float,
    volume: float,
    ref_vol: float,
    maturity: float = 1.0,
    threshold: float = _THRESHOLD,                
) -> dict:
    """
    Calcula las propiedades visuales de la burbuja combinando:
      - Fuerza de la señal (imbalance EMA)
      - Validación por volumen relativo al percentil histórico
      - Factor de madurez para evitar señales prematuras de baja muestra
      - Threshold adaptativo al timeframe actual
    """
    effective_signal = signal * maturity
    is_significant = abs(effective_signal) > threshold 

    if not is_significant:
        color: Literal["green", "red", "gray"] = "gray"
    elif effective_signal > 0:
        color = "green"
    else:
        color = "red"

    vol_ratio = math.tanh(volume / ref_vol) if ref_vol > 0 else 0.0

    if not is_significant:
        # Gris: tamaño proporcional al volumen (absorción visible)
        size = 6.0 + (30.0 * vol_ratio)
    else:
        impact = math.sqrt(abs(effective_signal) * vol_ratio)
        size = 15.0 + (80.0 * impact)

    return {
        "signal": signal,          # señal EMA cruda (sin madurez) para cálculos downstream
        "show_bubble": True,       # siempre visible; color distingue el estado
        "bubble_color": color,
        "bubble_size": round(size, 2),
    }