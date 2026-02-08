import pandas as pd
import time
from copy import deepcopy

# ----------------------------------------
# OHLCV incremental con snapshot por vela
# ----------------------------------------
class OHLCVSeries:
    def __init__(self, timeframe: str):
        self.timeframe = timeframe
        self.closed = []               # velas cerradas
        self.current = None            # vela en construcción
        self.current_snapshot = None   # snapshot antes del último tick
        self.tick_buffer = []          # ticks que forman la vela actual

    def update_tick(self, tick: pd.Series):
        ts = tick["timestamp"]
        price = tick["price"]
        qty = tick["qty"]

        # primer tick
        if self.current is None:
            self.current = {
                "start": ts.floor(self.timeframe),
                "open": price,
                "high": price,
                "low": price,
                "close": price,
                "volume": qty
            }
            self.tick_buffer.append(tick)
            self.current_snapshot = deepcopy(self.current)
            return

        # guardar snapshot antes de modificar
        self.current_snapshot = deepcopy(self.current)
        self.tick_buffer.append(tick)

        # mismo intervalo
        if ts < self.current["start"] + pd.Timedelta(self.timeframe):
            self.current["high"] = max(self.current["high"], price)
            self.current["low"] = min(self.current["low"], price)
            self.current["close"] = price
            self.current["volume"] += qty
        else:
            # cerrar vela actual
            self.closed.append(self.current)
            # crear nueva vela
            self.current = {
                "start": ts.floor(self.timeframe),
                "open": price,
                "high": price,
                "low": price,
                "close": price,
                "volume": qty
            }
            # reset buffer para la nueva vela
            self.tick_buffer = [tick]
            self.current_snapshot = deepcopy(self.current)

    def step_backward(self):
        if not self.tick_buffer:
            # no hay ticks, quizás eliminar la última vela cerrada
            if self.closed:
                self.current = self.closed.pop()
                self.tick_buffer = []
                self.current_snapshot = deepcopy(self.current)
            return

        # quitar el último tick
        self.tick_buffer.pop()
        # restaurar snapshot
        if self.tick_buffer:
            self.current = deepcopy(self.current_snapshot)
        else:
            # si no quedan ticks, retroceder a la vela anterior
            if self.closed:
                self.current = self.closed.pop()
                self.tick_buffer = []
                self.current_snapshot = deepcopy(self.current)
            else:
                self.current = None
                self.current_snapshot = None

    def get_ohlcv_df(self):
        df = pd.DataFrame(self.closed + ([self.current] if self.current else []))
        if not df.empty:
            df = df.set_index("start")
        return df


# ----------------------------------------
# Manager de timeframes
# ----------------------------------------
class TimeframeManager:
    def __init__(self, timeframes: list[str]):
        self.series = {tf: OHLCVSeries(tf) for tf in timeframes}

    def update_tick_all(self, tick: pd.Series):
        for series in self.series.values():
            series.update_tick(tick)

    def step_backward_all(self):
        for series in self.series.values():
            series.step_backward()

    def ohlcv(self, timeframe: str):
        return self.series[timeframe].get_ohlcv_df()


# ----------------------------------------
# Engine incremental bidireccional
# ----------------------------------------
class BacktestEngine:
    def __init__(self, ticks: pd.DataFrame, timeframes: list[str]):
        self.ticks = ticks.sort_values("timestamp").reset_index(drop=True)
        self.cursor = 0
        self.playing = False
        self.tf_manager = TimeframeManager(timeframes)

        # inicializa primera vela si hay ticks
        if len(self.ticks) > 0:
            self.tf_manager.update_tick_all(self.ticks.iloc[0])

    # -------------------------
    # Controles
    # -------------------------
    def step_forward(self):
        if self.cursor < len(self.ticks) - 1:
            self.cursor += 1
            tick = self.ticks.iloc[self.cursor]
            self.tf_manager.update_tick_all(tick)

    def step_backward(self):
        if self.cursor > 0:
            self.cursor -= 1
            self.tf_manager.step_backward_all()

    def play(self, speed: float = 0.01):
        self.playing = True
        while self.playing and self.cursor < len(self.ticks) - 1:
            self.step_forward()
            time.sleep(speed)

    def pause(self):
        self.playing = False

    # -------------------------
    # Accesos para UI
    # -------------------------
    def current_tick(self):
        return self.ticks.iloc[self.cursor]

    def ohlcv(self, timeframe: str):
        return self.tf_manager.ohlcv(timeframe)
