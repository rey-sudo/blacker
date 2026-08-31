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

        candles = tf.get_series(
            "Candlestick",
            "Candlestick"
        )

        ema_55 = tf.get_series(
            "EMA",
            "EMA 55"
        )

        ema_200 = tf.get_series(
            "EMA",
            "EMA 200"
        )

        current_55 = ema_55.live
        current_200 = ema_200.live

        if not hasattr(self, "previous_ema_55"):
            self.previous_ema_55 = current_55
            self.previous_ema_200 = current_200
            return None

        cross_up = (
            self.previous_ema_55.value <= self.previous_ema_200.value
            and current_55.value > current_200.value
        )

        cross_down = (
            self.previous_ema_55.value >= self.previous_ema_200.value
            and current_55.value < current_200.value
        )

        self.previous_ema_55 = current_55
        self.previous_ema_200 = current_200

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