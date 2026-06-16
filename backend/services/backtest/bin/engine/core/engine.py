from dataclasses import dataclass
from timeframes.candle import Candle

@dataclass
class TFState:
    live_candle: Candle
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

    def on_tick(self, tick):

        state = {}

        for agg in self.aggregators:
            candle, is_new = agg.update(tick)

            state[agg.name] = TFState(
                live_candle=candle,
                history=list(agg.candles.values())[-500:], 
                is_new=is_new,
                indicators=agg.indicators,
            )

        engine_state = EngineState(
            time=tick.timestamp_ms,
            timeframes=state
        )

        signal = self.strategy.evaluate(engine_state)

        self._publish_live(engine_state, signal)

        return signal