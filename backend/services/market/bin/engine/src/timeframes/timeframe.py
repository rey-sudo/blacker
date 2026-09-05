from collections import defaultdict
from dataclasses import asdict
from series.series import Series

class Timeframe:
    def __init__(self, name: str, timeframe_ms: int):
        self.levels: list[list[Series]] = []

        self.name = name
        self.timeframe_ms = timeframe_ms
        self.series: dict[str, Series] = {}

    def add_series(self, series: Series):
        series.timeframe = self
        self.series[series.id] = series

    def get_series(self, id: str) -> Series:
        return self.series[id]
    
    def live(self) -> dict:
        """
        Returns the live state of every series in this timeframe.
        """
        return {
            key: asdict(series.live) if series.live is not None else None
            for key, series in self.series.items()
        }
    
    def build_levels(self):
        groups = defaultdict(list)

        for series in self.series.values():
            groups[series.level].append(series)

        self.levels = [
            groups[level]
            for level in sorted(groups)
        ]

    def update(self, tick):
        for level in self.levels:
            for series in level:
                series.update(tick)

    def to_dict(self):
        return {
            "name": self.name,
            "timeframe_ms": self.timeframe_ms,
            "series": {
                id: series.to_dict()
                for id, series in self.series.items()
            },
        }