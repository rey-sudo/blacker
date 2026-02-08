import pandas as pd
import time

class OHLCVSeries:
    def __init__(self, timeframe: str):
        self.timeframe = timeframe
        
        self.df = pd.DataFrame(
            columns=["open", "high", "low", "close", "volume"]
        )

    def rebuild_from_ticks(self, ticks: pd.DataFrame):
        ohlcv = (
            ticks
            .set_index("timestamp")
            .resample(self.timeframe)
            .agg({
                "price": ["first", "max", "min", "last"],
                "qty": "sum"
            })
        )

        ohlcv.columns = ["open", "high", "low", "close", "volume"]
        self.df = ohlcv.dropna()


class TimeframeManager:
    def __init__(self, timeframes: list[str]):
        self.series = {
            tf: OHLCVSeries(tf) for tf in timeframes
        }

    def rebuild_all(self, ticks: pd.DataFrame):
        for series in self.series.values():
            series.rebuild_from_ticks(ticks)


class BacktestEngine:
    def __init__(
        self,
        ticks: pd.DataFrame,
        timeframes: list[str]
    ):
        self.ticks = ticks.sort_values("timestamp").reset_index(drop=True)
        self.cursor = 0
        self.playing = False

        self.tf_manager = TimeframeManager(timeframes)

        self._rebuild()

    # -------------------------
    # Reconstrucción total
    # -------------------------
    def _rebuild(self):
        current_ticks = self.ticks.iloc[: self.cursor + 1]
        self.tf_manager.rebuild_all(current_ticks)

    # -------------------------
    # Controles
    # -------------------------
    def step_forward(self):
        if self.cursor < len(self.ticks) - 1:
            self.cursor += 1
            self._rebuild()

    def step_backward(self):
        if self.cursor > 0:
            self.cursor -= 1
            self._rebuild()

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
        return self.tf_manager.series[timeframe].df
