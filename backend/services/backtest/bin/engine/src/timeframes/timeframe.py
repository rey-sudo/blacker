from collections import defaultdict
from series.series import Series

class Timeframe:
    def __init__(self, id: str, timeframe_ms: int):
        self.id: str = id
        self.timeframe_ms: int = timeframe_ms
        self.series: dict[str, Series] = {}
        self.levels: list[list[Series]] = []
        self.engine = None

    def add_series(self, series: Series):
        series.timeframe = self
        self.series[series.id] = series

    def get_series(self, series_id: str) -> Series:
        return self.series[series_id]
        
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
            "id": self.id,
            "timeframe_ms": self.timeframe_ms,
            "series": {
                id: series.to_dict()
                for id, series in self.series.items()
            },
        }