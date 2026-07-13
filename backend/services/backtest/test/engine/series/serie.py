from abc import ABC, abstractmethod

from engine.ingestion.tick import Tick


class Series(ABC):
    """
    Base class for every market series.

    A series owns its complete state (history, live data, indicators, etc.)
    and updates itself from incoming ticks.
    """

    @abstractmethod
    def update(self, tick: Tick) -> None:
        """
        Processes a market tick and updates the series state.
        """
        raise NotImplementedError