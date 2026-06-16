from .base import Strategy

class MyStrategy(Strategy):
    def evaluate(self, state):
        c5 = state.tf_5m.live_candle
        c30 = state.tf_30m.live_candle

        if c5.close > c5.open and c30.close > c30.open:
            return "BUY"

        if c5.close < c5.open and c30.close < c30.open:
            return "SELL"

        return None