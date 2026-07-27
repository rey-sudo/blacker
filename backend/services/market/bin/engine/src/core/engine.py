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

from typing import Any
from core.engine_state import EngineState
from ingestion.tick import Tick
from timeframes.timeframe import Timeframe
from series.registry import SERIES_REGISTRY


class TradingEngine:
    source: str
    symbol: str
    status: str
    state: EngineState | None
    timeframes: dict[str, Timeframe]

    listening: bool

    def __init__(self, source: str, symbol: str, status: str, state: EngineState | None, timeframes: dict[str, Timeframe]):
        self.source = source
        self.symbol = symbol        
        self.status = status
        self.state = state
        self.timeframes = timeframes
        
        self.listening = False

    @classmethod
    def from_snapshot(cls, snapshot: dict) -> "TradingEngine":
        """
        Builds a TradingEngine from a configuration dictionary.
        """
        
        timeframes = {}

        for tf_name, tf_cfg in snapshot["timeframes"].items():

            timeframe = Timeframe(
                name=tf_name,
                timeframe_ms=tf_cfg["timeframe_ms"],
            )

            for series_id, series_cfg in tf_cfg["series"].items():
                
                params = series_cfg.get("params", {})

                series_cls = SERIES_REGISTRY[params.get("name")]
    
                series = series_cls(**params)

                timeframe.add_series(series)   
                         
            timeframe.build_levels()

            timeframes[tf_name] = timeframe
        

        return cls(
            source=snapshot["source"],
            symbol= snapshot["symbol"],
            status= snapshot["status"],
            state=snapshot["state"],
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

        return self.state