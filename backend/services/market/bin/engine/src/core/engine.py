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
from ingestion.tick import Tick
from timeframes.timeframe import Timeframe
from series.registry import SERIES_REGISTRY


class TradingEngine:
    state: EngineState | None

    def __init__(self, state: EngineState | None):
        self.state = state

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

        state = EngineState(
            source=snapshot["source"],
            symbol= snapshot["symbol"],
            status= snapshot["status"],
            cursor_time=snapshot["cursor_time"],
            cursor_id=snapshot["cursor_id"],
            timeframes=timeframes,
        )

        return cls(
            state=state,
        )

    def on_tick(self, tick: Tick):
        for timeframe in self.state.timeframes.values():
            timeframe.update(tick)

        self.state = EngineState(
            source=self.state.source,
            symbol=self.state.symbol,
            status=self.state.status,            
            cursor_time=tick.time,
            cursor_id=tick.trade_id,
            timeframes=self.state.timeframes,
        )

        return self.state