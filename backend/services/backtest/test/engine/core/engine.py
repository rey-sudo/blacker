from core.engine_state import EngineState
from strategy.registry import STRATEGY_REGISTRY
from ingestion.tick import Tick
from timeframes.timeframe import Timeframe
from series.registry import SERIES_REGISTRY


class TradingEngine:

    def __init__(self, strategy, timeframes):
        self.status = 'init'

        self.boot_id = None
        self.tick_index = None
        self.state = None

        self.strategy = strategy
        self.timeframes = timeframes

    @classmethod
    def from_config(cls, config: dict) -> "TradingEngine":
        """
        Builds a TradingEngine from a configuration dictionary.
        """

        #
        # Build timeframes.
        #
        timeframes = {}

        for tf_cfg in config["timeframes"]:
            timeframe = Timeframe(
                name=tf_cfg["name"],
                timeframe_ms=tf_cfg["timeframe_ms"],
            )

            for series_cfg in tf_cfg["series"]:

                series_cls = SERIES_REGISTRY[series_cfg["type"]]

                series = series_cls(**series_cfg["params"])

                timeframe.add_series(series)            

            timeframes[timeframe.name] = timeframe

        #
        # Build strategy.
        #
        strategy_cfg = config["strategy"]

        strategy_cls = STRATEGY_REGISTRY[strategy_cfg["type"]]

        strategy = strategy_cls(**strategy_cfg["params"])

        return cls(
            strategy=strategy,
            timeframes=timeframes,
        )

    def on_tick(self, tick: Tick):
        for timeframe in self.timeframes.values():
            timeframe.update(tick)

        self.state = EngineState(
            tick_index=tick.tick_index,
            time=tick.time,
            timeframes=self.timeframes,
        )

        signal = self.strategy.evaluate(self.state)

        return self.state, signal