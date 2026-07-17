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
    delta_vol: float      # NUEVO: Desbalance absoluto en unidades operadas
    signal: float
    bubble_color: Literal["green", "red", "gray"]
    bubble_size: float
    show_bubble: bool
    tick_count: int


_THRESHOLD = 0.05


class CandleBubbleSeries(Series):
    """
    Aggregates market ticks into OHLCV candles enriched with
    order-flow bubble signals (buy/sell imbalance smoothed by EMA
    and weighted by relative volume).
    """

    def __init__(self, ema_span: int = 10, vol_window: int = 50):
        super().__init__("CandleBubbleSeries")

        self.live: CandleBubble | None = None
        self.history: list[CandleBubble] = []
        self.is_new: bool = False

        # Configuración encapsulada
        self._ema_span = ema_span
        self._ema_alpha = 2 / (ema_span + 1)
        self._vol_window = vol_window
        
        # Estado interno
        self._ema: float | None = None
        self._recent_volumes: list[float] = []
        self._max_vol: float = 1.0  # Evitar división por cero

    # ------------------------------------------------------------------
    # Serialization
    # ------------------------------------------------------------------

    def to_dict(self) -> dict:
        return {
            "name": self.name,
            "live": asdict(self.live) if self.live is not None and len(self.history) > 0 else None,
            "history": [asdict(c) for c in self.history],
            "is_new": self.is_new,
            "_ema": self._ema,
            "_recent_volumes": self._recent_volumes,
            "_max_vol": self._max_vol,
        }

    def set_state(self, state: dict) -> None:
        self.name = state["name"]

        self.live = (
            CandleBubble(**state["live"])
            if state["live"] is not None
            else None
        )

        self.history = [CandleBubble(**c) for c in state["history"]]
        self.is_new = state["is_new"]
        self._ema = state["_ema"]
        self._recent_volumes = state.get("_recent_volumes", [])
        self._max_vol = state.get("_max_vol", 1.0)

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
            # 1. Actualizar EMA con el delta de la vela cerrada
            self._ema = self._next_ema(live.delta_pct)
            
            # 2. Actualizar ventana de volúmenes para normalización visual
            self._recent_volumes.append(live.volume)
            if len(self._recent_volumes) > self._vol_window:
                self._recent_volumes.pop(0)
            self._max_vol = max(self._recent_volumes) if self._recent_volumes else 1.0

            # 3. Sellar vela anterior
            closed = self._apply_signal(live, self._ema, self._max_vol)
            self.history.append(closed)

            # 4. Abrir nueva vela
            self.live = self._new_candle(bucket, tick)
            self.is_new = True
            return

        #
        # Actualización de vela viva (Live)
        #
        new_buy_qty = live.buy_qty + (0.0 if tick.is_buyer_maker else tick.qty)
        new_sell_qty = live.sell_qty + (tick.qty if tick.is_buyer_maker else 0.0)

        delta_pct = _delta_pct(new_buy_qty, new_sell_qty)
        preview_signal = self._next_ema(delta_pct) if self._ema is not None else delta_pct
        current_vol = live.volume + tick.qty
        
        # Para la vela viva, usamos el max_vol histórico, pero aseguramos no dividir por 0
        preview_max_vol = max(self._max_vol, current_vol)

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
            **_bubble_fields(preview_signal, current_vol, preview_max_vol),
        )

        self.is_new = False

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    def _new_candle(self, bucket: int, tick: Tick) -> CandleBubble:
        buy_qty = 0.0 if tick.is_buyer_maker else tick.qty
        sell_qty = tick.qty if tick.is_buyer_maker else 0.0
        delta_pct = _delta_pct(buy_qty, sell_qty)

        signal = self._next_ema(delta_pct)
        start_ts = bucket * self.timeframe_ms
        current_vol = tick.qty
        preview_max_vol = max(self._max_vol, current_vol)

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
            **_bubble_fields(signal, current_vol, preview_max_vol),
        )

    def _next_ema(self, value: float) -> float:
        if self._ema is None:
            return value
        return self._ema_alpha * value + (1 - self._ema_alpha) * self._ema

    @staticmethod
    def _apply_signal(candle: CandleBubble, signal: float, max_vol: float) -> CandleBubble:
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
            **_bubble_fields(signal, candle.volume, max_vol),
        )


# ------------------------------------------------------------------
# Pure functions
# ------------------------------------------------------------------

def _delta_pct(buy_qty: float, sell_qty: float) -> float:
    total = buy_qty + sell_qty
    return (buy_qty - sell_qty) / total if total > 0.0 else 0.0


def _bubble_fields(signal: float, volume: float, max_vol: float) -> dict:
    """
    Calcula las propiedades visuales de la burbuja ponderando 
    la señal (imbalance) con la liquidez real (volumen).
    """
    show_bubble = abs(signal) > _THRESHOLD

    if not show_bubble:
        color: Literal["green", "red", "gray"] = "gray"
    elif signal > 0:
        color = "green"
    else:
        color = "red"

    if show_bubble and max_vol > 0:
        # 1. Normalizar el volumen frente a la historia reciente (Topado a 1.5 por picos extremos)
        vol_ratio = min(volume / max_vol, 1.5)
        
        # 2. El tamaño ahora depende de DOS factores: La fuerza de la señal y la validación del volumen.
        # Usamos raíz cuadrada para suavizar el impacto visual (hace que el Área del círculo sea proporcional)
        impact = math.sqrt(abs(signal)) * math.sqrt(vol_ratio)
        size = 15 + (80 * impact)
    else:
        size = 0.0

    return {
        "signal": signal,
        "show_bubble": show_bubble,
        "bubble_color": color,
        "bubble_size": round(size, 2),
    }