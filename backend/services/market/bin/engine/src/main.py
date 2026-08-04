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

import json
from time import sleep
import clickhouse_connect
import msgpack
from core.engine_state import EngineState
from ingestion.tick import Tick
from core.engine import TradingEngine
from ingestion.pulsar_consumer import PulsarConsumer
from publication.pulsar_publisher import PulsarPublisher

ENGINE_ID = "binance-BTCUSDT"

default_snapshot = {
  "source": "binance",
  "symbol": "BTCUSDT",
  "status": "init",
  "cursor_time": 0,
  "cursor_id": "",
  "timeframes": {
    "1m": {
      "name": "1m",
      "timeframe_ms": 60000,
      "series": {
        "candle-series": {  
          "params": {
            "level": 0,
            "name": "CandleBubbleSeries", #kind
            "id": "candle-series",
          }
        },
      }   
    },

    "5m": {
      "name": "5m",
      "timeframe_ms": 300000,
      "series": {
        "candle-series": {  
          "params": {
            "level": 0,
            "name": "CandleBubbleSeries", #kind
            "id": "candle-series",
          }
        } 
      }   
    }
  }
}

db = clickhouse_connect.get_client(
    host="localhost",
    port=8123,
    database="app",
    username="app",
    password="app123"
)

result = db.query(
    """
    SELECT value
    FROM kv_store
    FINAL
    WHERE key = %(key)s
    """,
    parameters={"key": ENGINE_ID },
)

if result.result_rows:
    snapshot = json.loads(result.first_row[0])
else:
    snapshot = default_snapshot

consumer = PulsarConsumer(
        service_url="pulsar://localhost:6650",
        topic=f"persistent://public/default/ticks-{ENGINE_ID}",
        subscription=f"{ENGINE_ID}-sub",
)

publisher = PulsarPublisher(
    service_url="pulsar://localhost:6650",
    topic_prefix=f"persistent://public/default/live-{ENGINE_ID}",
)

engine = TradingEngine.from_snapshot(snapshot)

def save_snapshot(state: EngineState):
      db.insert(
        "kv_store",
        [
          [
            ENGINE_ID,
            state.to_json()
          ]
        ],
        column_names=["key", "value"]
      )    

#-----------------------------------------------------------------------------------------------------------------------
# HANDLE TICKS
#----------------------------------------------------------------------------------------------------------------------- 

"""
This is state.live() content

{
  "1m": {
    "source": "binance",
    "symbol": "BTCUSDT",
    "timeframe": "1m",
    "series": {
      "candle-series": {
        "time": 1785281520,
        "open": 63705.6,
        "high": 63705.6,
        "low": 63705.6,
        "close": 63705.6,
        "volume": 0.001,
        "start_ts": 1785281520000,
        "end_ts": 1785281580000
      },
      "other-series": ...
    }
  },

  "5m": ...
}
"""
live_events: list[dict[str, dict]] = []

def handle_tick(tick: Tick, is_last: bool):
    current_time = engine.state.cursor_time
    if current_time != 0 and tick.time < current_time:
        print("Tick order error (ACKING).")
        return

    state = engine.on_tick(tick)
    
    live_events.append(state.live())

    if is_last:
        save_snapshot(state)
        for event in live_events:
            for timeframe, payload in event.items():
                publisher.publish(
                    timeframe,
                    msgpack.packb(payload, use_bin_type=True) 
                )

        live_events.clear()
          
#-----------------------------------------------------------------------------------------------------------------------
# MAIN
#----------------------------------------------------------------------------------------------------------------------- 

def main():
    consumer.listen(handle_tick)
    
main()
