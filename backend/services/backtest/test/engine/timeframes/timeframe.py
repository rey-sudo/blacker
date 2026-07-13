from engine.series.serie import Series
from engine.ingestion.tick import Tick

class Timeframe:
    """
    Represents a market timeframe.

    Series are updated in registration order.
    """

    def __init__(self, name: str):
        self.name = name
        self.series: list[Series] = []

    def add_series(self, new_series: Series) -> None:
        """
        Registers a series into this timeframe.
        """

        new_series.timeframe = self
        self.series.append(new_series)

        return self

    def update(self, tick: Tick) -> None:
        """
        Updates all registered series.
        """

        for series in self.series:
            series.update(tick)