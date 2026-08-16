from collections import defaultdict
from dataclasses import asdict
from series.series import Series


class Timeframe:
    def __init__(self, id: str, timeframe_ms: int):
        self.id: str = id
        self.timeframe_ms: int = timeframe_ms

        self.series: dict[str, Series] = {}
        self.levels: list[list[Series]] = []

        self.engine = None

        # Bar construido por BarAggregator
        self.live = None
        self.history = []

        self.is_new: bool = False
        self.is_closed: bool = False

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

    def update(self):
        """
        Actualiza todas las Series usando el estado
        actual del Timeframe.

        La barra live/history es construida por
        BarAggregator.
        """

        for level in self.levels:
            for series in level:
                series.update()

    def to_dict(self):
        return {
            "id": self.id,
            "timeframe_ms": self.timeframe_ms,

            "live": asdict(self.live),
            "history": [asdict(bar) for bar in self.history[-50:]],

            "is_new": self.is_new,
            "is_closed": self.is_closed,

            "series": {
                id: series.to_dict()
                for id, series in self.series.items()
            },
        }