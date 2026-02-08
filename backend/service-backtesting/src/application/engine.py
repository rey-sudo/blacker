import pandas as pd
import time

# ----------------------------------------
# OHLCV incremental por timeframe
# ----------------------------------------
class OHLCVSeries:
    def __init__(self, timeframe: str):
        self.timeframe = timeframe
        self.closed = []       # velas cerradas
        self.current = None    # vela en construcción

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
            return

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

    def remove_last_tick(self, tick: pd.Series):
        """
        Para step_backward: eliminamos el tick actual.
        Simple: se reconstruye solo la última vela si es necesario.
        """
        # reconstrucción mínima: quitar vela actual si vacía
        # para simplificar, se recalcula a partir de los ticks de esa vela
        # en un engine real se usaría stack o snapshots
        raise NotImplementedError("step_backward requiere snapshot o reconstrucción parcial")

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

    def ohlcv(self, timeframe: str):
        return self.series[timeframe].get_ohlcv_df()


# ----------------------------------------
# Engine incremental
# ----------------------------------------
class BacktestEngine:
    def __init__(self, ticks: pd.DataFrame, timeframes: list[str]):
        self.ticks = ticks.sort_values("timestamp").reset_index(drop=True)
        self.cursor = 0
        self.playing = False
        self.tf_manager = TimeframeManager(timeframes)

        # inicializamos primera vela
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
        # 🔹 Simplificación: para step_backward real necesitarías snapshots
        raise NotImplementedError("Step backward aún no implementado en incremental")

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
