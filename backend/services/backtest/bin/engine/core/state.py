# core/state.py
from dataclasses import dataclass

@dataclass
class TFState:
    live_candle: object
    indicators: dict

@dataclass
class EngineState:
    tf_5m: TFState
    tf_30m: TFState
    time: int