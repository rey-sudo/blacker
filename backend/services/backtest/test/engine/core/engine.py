from dataclasses import dataclass
from engine.ingestion.tick import Tick

@dataclass
class EngineState:
    time: int
    timeframes: dict

class TradingEngine:
    def __init__(self, strategy, timeframes):
        self.state = None
        self.strategy = strategy
        self.timeframes = timeframes

    def on_tick(self, tick: Tick):
        for timeframe in self.timeframes.values():
            timeframe.update(tick)

        # Build the current engine state.
        self.state = EngineState(
            time=tick.time,
            timeframes=self.timeframes,
        )

        signal = self.strategy.evaluate(self.state)

        return self.state, signal