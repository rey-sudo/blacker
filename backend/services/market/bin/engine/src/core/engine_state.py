import json
import msgpack
from dataclasses import asdict, dataclass
from timeframes.timeframe import Timeframe
from dataclasses import dataclass

@dataclass(slots=True)
class LiveBatch:
    source: str
    symbol: str
    series: dict

    def to_dict(self) -> dict:
        return asdict(self)
    
    def msgpack(self) -> bytes:
        return msgpack.packb(
            self.to_dict(),
            use_bin_type=True,
        )

    def to_json(self) -> str:
        return json.dumps(
            self.to_dict(),
            ensure_ascii=False,
        )

@dataclass
class EngineState:
    source: str
    symbol: str
    status: str    
    cursor_time: int
    cursor_id: str
    timeframes: dict[str, Timeframe]
    
    def live(self) -> LiveBatch:
        series = {}

        for timeframe in self.timeframes.values():
            series.update(timeframe.live())

        return LiveBatch(
            source=self.source,
            symbol=self.symbol,
            series=series,
        )
    
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