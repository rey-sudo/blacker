from .base import Strategy
from pprint import pprint

class MyStrategy(Strategy):

    def evaluate(self, state):

        tf1 = state.timeframes.get("1m")

        if not tf1:
            return None

        if not tf1.is_new:
            return None

        pprint(vars(tf1))
        print("=" * 50)

        return None