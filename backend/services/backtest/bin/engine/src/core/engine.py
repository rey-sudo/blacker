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

from aggregator.bar_aggregator import BarAggregator
from strategy.base import Strategy
from core.engine_state import EngineState
from strategy.registry import STRATEGY_REGISTRY
from ingestion.tick import Tick
from timeframes.timeframe import Timeframe
from series.registry import SERIES_REGISTRY

class TradingEngine:
    def __init__(self):
        self.status: str = 'init'
        self.boot_id: str | None = None
        self.config_id: str | None = None
        self.state: EngineState | None = None
        self.timeframes: dict[str, Timeframe] = {}
        self.bar_aggregator: BarAggregator | None = None
        self.strategy: Strategy | None = None

    def reset(self):
        print("Reseting engine...")

        self.status = "init"
        self.boot_id = None
        self.config_id = None
        self.state = None
        self.timeframes = {}
        self.bar_aggregator = None
        self.strategy = None

    def set_state(self, boot_id: str, config_id: str, engine_state: dict) -> None:
        """
        Restores the engine state from a serialized dictionary.
        """
        self.boot_id = boot_id
        self.config_id = config_id

        timeframes = {}
        #
        # Setup timeframes and series
        #
        for tf_value in engine_state["timeframes"].values():
            timeframe = Timeframe()
            timeframe.set_state(tf_value)
            #
            # Add Timeframe series
            #
            for state in tf_value["series"].values():

                series = SERIES_REGISTRY[state["kind"]](
                    state["id"],
                    state["kind"],
                    state["level"],
                    state["primary"],
                    state["overlay"],
                    state["params"],
                )
                series.set_state(state)

                timeframe.add_series(series)
            #
            # Build the series execution level
            #                         
            timeframe.build_levels()
            timeframes[timeframe.id] = timeframe
        #
        # Build engine strategy
        #
        strategy = STRATEGY_REGISTRY[engine_state["strategy"]["kind"]](
            engine_state["strategy"]["kind"],
            engine_state["strategy"]["params"]        
        )
        strategy.set_state(engine_state["strategy"])

        self.timeframes = timeframes
        self.bar_aggregator = BarAggregator(
            timeframes=self.timeframes
        )
        self.strategy = strategy        
        #
        # Engine state
        #
        self.state = EngineState(
            boot_id=self.boot_id,
            config_id=self.config_id,
            tick_index=engine_state["tick_index"],
            time=engine_state["time"], 
            timeframes=self.timeframes,
            strategy=self.strategy 
        )

    def on_tick(self, tick: Tick):
        self.bar_aggregator.update(tick)

        for timeframe in self.timeframes.values():
            timeframe.update()

        self.state = EngineState(
            boot_id=self.boot_id,
            config_id=self.config_id,
            tick_index=tick.tick_index,
            time=tick.time,
            timeframes=self.timeframes, 
            strategy=self.strategy  
        )

        signal = self.strategy.evaluate(self.state)

        #orders = self.order_manager.handle(self.state, signal)

        return self.state, signal



"""
        fills = self.execution.process(
            tick,
            orders,
        )

        for fill in fills:
            new_orders = self.order_manager.on_fill(fill)

            self.execution.submit(new_orders)

"""



