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


        return None