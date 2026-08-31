from core.engine_state import EngineState
from .base import Strategy
from orders import Signal, OrderType

class Strategy1(Strategy):

    def __init__(
        self,
        kind: str,
        params: dict
        ):
            super().__init__(
                kind,
                params,
            )        

            self.count: int = 0

    def to_dict(self):
        return {
            "kind": self.kind,
            "params": self.params,
            "count": self.count
        }

    def set_state(self, state: dict) -> None:
        count = state.get("count")
        if count is not None:
            self.count = count

    def evaluate(self, state: EngineState):

        tf = state.timeframes.get("1m")

        ema_55 = tf.get_series(
            "EMA",
            "EMA 55"
        )

        ema_200 = tf.get_series(
            "EMA",
            "EMA 200"
        )

        previous_55 = ema_55.history[-1]
        previous_200 = ema_200.history[-1]

        current_55 = ema_55.live
        current_200 = ema_200.live

        cross_up = (
            previous_55.value <= previous_200.value
            and current_55.value > current_200.value
        )

        cross_down = (
            previous_55.value >= previous_200.value
            and current_55.value < current_200.value
        )

        if cross_up:
            return Signal(
                action="BUY",
                quantity=1,
                order_type=OrderType.MARKET,
            )

        if cross_down:
            return Signal(
                action="EXIT",
            )

        return None