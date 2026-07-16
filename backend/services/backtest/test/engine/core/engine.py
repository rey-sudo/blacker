# BLACKER
# Copyright (C) 2026 Juan José Caballero Rey
#
# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation version 3 of the License.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
# GNU General Public License for more details.
#
# You should have received a copy of the GNU General Public License
# along with this program. If not, see <https://www.gnu.org/licenses/>.

from core.engine_state import EngineState
from strategy.registry import STRATEGY_REGISTRY
from ingestion.tick import Tick
from timeframes.timeframe import Timeframe
from series.registry import SERIES_REGISTRY


class TradingEngine:
    status: str
    boot_id: str | None
    listening: bool

    def __init__(self, strategy, timeframes):
        self.status = 'init'
        self.boot_id = None
        self.state = None

        self.listening = False
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

    def set_state(self, engine_state: dict) -> None:
        """
        Restores the engine state from a serialized dictionary.
        """

        timeframes = {}

        for tf_name, tf_state in engine_state["timeframes"].items():

            timeframe = Timeframe(
                name=tf_state["name"],
                timeframe_ms=tf_state["timeframe_ms"],
            )

            for series_type, series_state in tf_state["series"].items():

                series_cls = SERIES_REGISTRY[series_type]

                series = series_cls()

                series.set_state(series_state)

                timeframe.add_series(series)

            timeframes[tf_name] = timeframe

        self.timeframes = timeframes

        self.state = EngineState(
            boot_id=self.boot_id,
            tick_index=engine_state["tick_index"],
            time=engine_state["time"],
            timeframes=self.timeframes,
        )

    def on_tick(self, tick: Tick):
        for timeframe in self.timeframes.values():
            timeframe.update(tick)

        self.state = EngineState(
            boot_id=self.boot_id,
            tick_index=tick.tick_index,
            time=tick.time,
            timeframes=self.timeframes,
        )

        signal = self.strategy.evaluate(self.state)

        return self.state, signal