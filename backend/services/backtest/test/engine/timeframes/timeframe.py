from dataclasses import dataclass
from series.series import Series
from ingestion.tick import Tick

@dataclass
class Timeframe:
    def __init__(self, name: str, timeframe_ms: int):
        self.name = name
        self.timeframe_ms = timeframe_ms
        self.series: dict[str, Series] = {}

    def add_series(self, series: Series):

        series.timeframe = self

        self.series[series.id] = series

        return self

    def get_series(self, id: str) -> Series:
        return self.series[id]
        
    def update(self, tick: Tick) -> None:
        """
        Updates all registered series.
        """
        for series in self.series.values():
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