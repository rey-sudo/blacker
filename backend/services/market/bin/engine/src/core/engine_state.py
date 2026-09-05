import json
import msgpack
from dataclasses import dataclass
from timeframes.timeframe import Timeframe
from dataclasses import dataclass

@dataclass
class EngineState:
    source: str
    symbol: str
    status: str    
    cursor_time: int
    cursor_id: str
    timeframes: dict[str, Timeframe]
    
    def live(self):
        """
        Returns the live state of every timeframe.
        """
        return {
            name: {
                "source": self.source,
                "symbol": self.symbol,
                "timeframe": name,
                "series": timeframe.live(),
            }
            for name, timeframe in self.timeframes.items()
        }

    def to_dict(self):
        return {
            "source": self.source,
            "symbol": self.symbol,
            "status": self.status,
            "cursor_time": self.cursor_time,
            "cursor_id": self.cursor_id,
            "timeframes": {
                name: timeframe.to_dict()
                for name, timeframe in self.timeframes.items()
            },
        }

    def to_msgpack(self) -> bytes:
        return msgpack.packb(
            self.to_dict(),
            use_bin_type=True,
        )

    def to_json(self) -> str:
        return json.dumps(
            self.to_dict(),
            ensure_ascii=False,
        )