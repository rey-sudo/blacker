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

from strategy.base import Strategy
from core.engine_state import EngineState
from strategy.registry import STRATEGY_REGISTRY
from ingestion.tick import Tick
from timeframes.timeframe import Timeframe
from series.registry import SERIES_REGISTRY


class TradingEngine:
    def __init__(self, strategy=None, timeframes=None):
        self.status: str = 'init'
        self.boot_id: str | None = None
        self.config_hash: str | None = None
        self.state: EngineState | None = None
        self.strategy: Strategy | None = strategy
        self.timeframes: dict[str, Timeframe] = timeframes or {}

        for timeframe in self.timeframes.values():
            timeframe.engine = self

    def reset(self):
        self.status = "init"
        self.boot_id = None
        self.config_hash = None
        self.state = None
        self.strategy = None
        self.timeframes = {}

    def set_state(self, config_hash: str, engine_state: dict, strategy: dict) -> None:
        """
        Restores the engine state from a serialized dictionary.
        """

        self.config_hash = config_hash

        timeframes = {}

        for tf_id, tf_value in engine_state["timeframes"].items():
            timeframe = Timeframe(
                id=tf_id,
                timeframe_ms=tf_value["timeframe_ms"],
            )

            for series_id, series_value in tf_value["series"].items():
                series_cls = SERIES_REGISTRY[series_value.get("kind")]
                timeframe.add_series(series_cls(**series_value))   
                         
            timeframe.build_levels()
            timeframes[timeframe.id] = timeframe

        strategy_cls = STRATEGY_REGISTRY[strategy["kind"]]
        strategy = strategy_cls(**strategy["params"])

        self.timeframes = timeframes
        self.strategy = strategy

        self.state = EngineState(
            boot_id=self.boot_id,
            config_hash=self.config_hash,
            tick_index=engine_state["tick_index"],
            time=engine_state["time"],
            timeframes=self.timeframes,
        )

    def on_tick(self, tick: Tick):
        for timeframe in self.timeframes.values():
            timeframe.update(tick)

        self.state = EngineState(
            boot_id=self.boot_id,
            config_hash=self.config_hash,
            tick_index=tick.tick_index,
            time=tick.time,
            timeframes=self.timeframes
        )

        signal = self.strategy.evaluate(self.state)

        return self.state, signal