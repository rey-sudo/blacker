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

from abc import ABC, abstractmethod
from ingestion.tick import Tick


class Series(ABC):
    """
    Base class for every market series.

    A series owns its complete state (history, live data, indicators, etc.)
    and updates itself from incoming ticks.
    """
    def __init__(self, level: int, kind: str, id: str, params: dict):
        self.id = id
        self.kind = kind
        self.level = level
        self.params = params
        self._timeframe = None

    @property
    def timeframe_ms(self) -> int:
        return self._timeframe.timeframe_ms

    @property
    @abstractmethod
    def live(self):
        """
        Returns the current live state of the series.
        """
        raise NotImplementedError

    @live.setter
    @abstractmethod
    def live(self, value):
        """
        Sets the current live state of the series.
        """
        raise NotImplementedError
        
    @abstractmethod
    def update(self, tick: Tick) -> None:
        """
        Processes a market tick and updates the series state.
        """
        raise NotImplementedError