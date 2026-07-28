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

from ingestion.tick import Tick
from core.engine import TradingEngine
from ingestion.pulsar_consumer import PulsarConsumer
from publication.pulsar_publisher import PulsarPublisher

snapshot = {
  "source": "dydx",
  "symbol": "BTC-USD",
  "status": "init",
  "cursor_time": 0,
  "cursor_id": "",
  "timeframes": {
    "1m": {
      "name": "1m",
      "timeframe_ms": 60000,
      "series": {
        "CandleBubbleSeries1": {  
          "params": {
            "level": 0,
            "name": "CandleSeries",
            "id": "CandleSeries1",
          }
        } 
      }   
    }
  }
}

consumer = PulsarConsumer(
        service_url="pulsar://localhost:6650",
        topic="persistent://public/default/ticks-dydx-BTC-USD",
        subscription="testa1",
)

publisher = PulsarPublisher(
    service_url="pulsar://localhost:6650",
    topic="persistent://public/default/live-dydx-BTC-USD",
)

engine = TradingEngine.from_snapshot(snapshot)

#-----------------------------------------------------------------------------------------------------------------------
# HANDLE TICKS
#----------------------------------------------------------------------------------------------------------------------- 

def handle_tick(tick: Tick, is_last: bool):
    state = engine.on_tick(tick)

    print(state.to_json())

    for live in state.live():
      print(live)

    #PERSIST SNAPSHOT
    #PUBLISH LIVE
   
#-----------------------------------------------------------------------------------------------------------------------
# MAIN
#----------------------------------------------------------------------------------------------------------------------- 

def main():
    consumer.listen(handle_tick)
    
main()
