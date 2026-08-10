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

import requests
from ingestion.tick import Tick
from core.engine import TradingEngine
from ingestion.pulsar_consumer import PulsarConsumer
from publication.pulsar_publisher import PulsarPublisher

#-----------------------------------------------------------------------------------------------------------------------
# IMPLEMENTATION
#-----------------------------------------------------------------------------------------------------------------------

consumer = PulsarConsumer(
        service_url="pulsar://localhost:6650",
        topic="persistent://public/default/master.tick",
        subscription="engine-sub",
)

publisher = PulsarPublisher(
    service_url="pulsar://localhost:6650",
    topic="persistent://public/default/engine.state",
)

engine = TradingEngine()

#-----------------------------------------------------------------------------------------------------------------------
# HANDLE TICKS
#-----------------------------------------------------------------------------------------------------------------------
def get_backtest_state():
    response = requests.get(
        "http://localhost:3002/api/backtest/master/get-state"
    )
    response.raise_for_status()
    return response.json()

def handle_tick(tick: Tick, is_last: bool):
    #time.sleep(5) #DEBUG

    if engine.status == 'init':
        data = get_backtest_state()
        engine.boot_id = data["boot_id"]
        engine.set_state(engine_state=data['master']['engine_state'], strategy=data['master']['engine_strategy'])
        engine.status = 'ready'

    if engine.status != 'ready':
        raise Exception("Engine is not ready.")  #NACK

    if engine.boot_id != tick.boot_id:
        print(f"Incorrect boot_id engine.boot_id={engine.boot_id}, tick.boot_id={tick.boot_id}")
        return #ACK 
      
    if engine.state.tick_index > 0:
        if tick.tick_index - 1 != engine.state.tick_index:
            print(
                f"Ignoring tick index. "
                f"engine.state.tick_index={engine.state.tick_index}, "
                f"tick.tick_index={tick.tick_index}, "
                f"expected={engine.state.tick_index + 1}"
            )

            raise Exception("Incorrect tick index.") #NACK
               
    state, signal = engine.on_tick(tick)

    if signal:
        print("SIGNAL:", signal)
    
    if tick.tick_index % 100_000 == 0:
        print(f"Processed: {tick.tick_index}")

    if is_last:
        publisher.publish(state) 

#-----------------------------------------------------------------------------------------------------------------------
# MAIN
#-----------------------------------------------------------------------------------------------------------------------

def main():
    consumer.listen(handle_tick)

main()