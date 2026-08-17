from collections import defaultdict, deque
from dataclasses import asdict
from aggregator.bar_aggregator import Bar
from series.series import Series

MAX_HISTORY = 10

class Timeframe:
    def __init__(self):
        self._series: dict[str, Series] = {}
        self._levels: list[list[Series]] = []

        self.id: str = ""
        self.timeframe_ms: int = 0
        # Used by BarAggregator, Series
        self.live: Bar | None = None
        self.is_new: bool = False
        self.is_closed: bool = False

    def to_dict(self):
        return {
            "id": self.id,
            "timeframe_ms": self.timeframe_ms,
            "live": asdict(self.live) if self.live is not None else None,
            "is_new": self.is_new,
            "is_closed": self.is_closed,
            "series": {
                id: series.to_dict()
                for id, series in self._series.items()
            },
        }

    def set_state(self, state: dict) -> None:
        self.id = state.get("id")
        self.timeframe_ms = state.get("timeframe_ms")

        self.live = (
            Bar(**state.get("live"))
            if state.get("live") is not None
            else None
        )
        self.is_new = state.get("is_new")
        self.is_closed = state.get("is_closed")

    def add_series(self, series: Series):
        series.timeframe = self
        self._series[series.id] = series

    def get_series(self, series_id: str) -> Series:
        return self._series[series_id]

    def build_levels(self):
        groups = defaultdict(list)

        for series in self._series.values():
            groups[series.level].append(series)

        self._levels = [
            groups[level]
            for level in sorted(groups)
        ]

    def update(self):
        """
        Actualiza todas las Series usando el estado
        actual del Timeframe.

        La barra live/history es construida por
        BarAggregator.
        """

        for level in self._levels:
            for series in level:
                series.update()


 