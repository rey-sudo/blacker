from .state import EngineState, TFState

class TradingEngine:
    def __init__(self, strategy, agg_5m, agg_30m):
        self.strategy = strategy
        self.agg_5m = agg_5m
        self.agg_30m = agg_30m

        self.state = None

    def on_tick(self, tick):

        _, candle_5m = self.agg_5m.update(tick)
        _, candle_30m = self.agg_30m.update(tick)

        state = self._build_state(tick.timestamp_ms, candle_5m, candle_30m)

        signal = self.strategy.evaluate(state)

        return signal

    def _build_state(self, ts, c5, c30):

        return EngineState(
            time=ts,
            tf_5m=TFState(
                live_candle=c5,
                indicators={}
            ),
            tf_30m=TFState(
                live_candle=c30,
                indicators={}
            )
        )