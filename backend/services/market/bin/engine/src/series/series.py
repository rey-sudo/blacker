from abc import ABC, abstractmethod
from ingestion.tick import Tick


class Series(ABC):
    """
    Base class for every market series.

    A series owns its complete state (history, live data, indicators, etc.)
    and updates itself from incoming ticks.
    """
    def __init__(self, level: int, name: str, id: str):
        self.level = level
        self.name = name
        self.id = id
        self.timeframe = None

    @property
    def timeframe_ms(self) -> int:
        return self.timeframe.timeframe_ms

    @abstractmethod
    def update(self, tick: Tick) -> None:
        """
        Processes a market tick and updates the series state.
        """
        raise NotImplementedError