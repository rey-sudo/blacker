from dataclasses import dataclass
from timeframes.candle import Candle

@dataclass
class TFState:
    live_candle: object
    history: list[Candle]
    is_new: bool
    indicators: dict

@dataclass
class EngineState:
    time: int
    timeframes: dict

class TradingEngine:
    def __init__(self, strategy, aggregators):
        self.strategy = strategy
 
        self.aggregators = aggregators

        self.state = None

    def on_tick(self, tick):

        state = {}

        for agg in self.aggregators:
            candle, is_new = agg.update(tick)

            history = list(agg.candles.values())

            state[agg.name] = TFState(
                live_candle=candle,
                history=history,
                is_new=is_new,
                indicators=agg.indicators,
            )

        engine_state = self._build_state(
            tick.timestamp_ms,
            state
        )

        return self.strategy.evaluate(engine_state)

    def _build_state(self, ts, state):
        return EngineState(
            time=ts,
            timeframes=state
        )