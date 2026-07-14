import json
import msgpack
from dataclasses import dataclass

@dataclass
class EngineState:
    boot_id: str
    tick_index: int
    time: int
    timeframes: dict

    def to_dict(self):
        return {
            "boot_id": self.boot_id,
            "tick_index": self.tick_index,
            "time": self.time,
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
    