import json
import msgpack
from dataclasses import dataclass
from timeframes.timeframe import Timeframe

@dataclass
class EngineState:
    source: str
    symbol: str
    status: str    
    cursor_time: int
    cursor_id: str
    timeframes: dict[str, Timeframe]

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

    def to_json(self) -> str:
        return json.dumps(
            self.to_dict(),
            indent=2,
            ensure_ascii=False,
        )

    def to_msgpack(self) -> bytes:
        return msgpack.packb(
            self.to_dict(),
            use_bin_type=True,
        )
    