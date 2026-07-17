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

import sys
import threading
from core.heartbeat_task import HeartbeatTask
from ingestion.tick import Tick
from core.engine import TradingEngine
from ingestion.pulsar_consumer import PulsarConsumer
from publication.pulsar_publisher import PulsarPublisher

engine_config = {
  "timeframes": [
    {
      "name": "1m",
      "timeframe_ms": 900000,
      "series": [ 
        {
          "type": "CandleBubbleSeries",
          "params": {}
        }
      ]
    }
  ],
  "strategy": {
    "type": "MyStrategy",
    "params": {}
  }
}

consumer = PulsarConsumer(
        service_url="pulsar://localhost:6650",
        topic="persistent://public/default/master.tick",
        subscription="engine-sub",
)

publisher = PulsarPublisher(
    service_url="pulsar://localhost:6650",
    topic="persistent://public/default/engine.state",
)

engine = TradingEngine.from_config(engine_config)

#-----------------------------------------------------------------------------------------------------------------------
# HANDLE TICKS
#----------------------------------------------------------------------------------------------------------------------- 

def handle_tick(tick: Tick, is_last: bool):
    #time.sleep(5) #DEBUG

    if engine.status != 'ready':
        raise Exception("Engine is not ready.")  #NACK

    if engine.boot_id != tick.boot_id:
        print(
            f"Incorrect boot_id."
            f"engine.boot_id={engine.boot_id}, tick.boot_id={tick.boot_id}"
        )

        if tick.boot_id > engine.boot_id:
            raise Exception("Incorrect upper boot_id.")  #NACK
        else:
            print("Ignoring old tick.")
            return #ACK
    
    if engine.state != None:
        if engine.state.tick_index != tick.tick_index - 1:
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
    
    if tick.tick_index % 10000 == 0:
        print(f"Processed: {tick.tick_index}")

    if is_last:
        publisher.publish(state)

def listen():
    if engine.listening:
        return
    
    engine.listening = True
    
    thread = threading.Thread(
        target=consumer.listen,
        args=(handle_tick,),
        daemon=True,
    )

    thread.start()

#-----------------------------------------------------------------------------------------------------------------------
# HANDLE STATE
#----------------------------------------------------------------------------------------------------------------------- 

def handle_state(data) -> bool:
    boot_id = data['boot_id']
    state = data['engine_state']

    #TODO: CHECK STRUCT
    
    # If the master sends and EngineState None
    if engine.status == 'init':
        if state == None:
            engine.boot_id = boot_id
            engine.status = 'ready'
            listen()
            return True
        else:
            engine.boot_id = boot_id
            engine.set_state(engine_state=state)
            engine.status = 'ready'
            listen()
            return True
        
    if engine.status == 'ready':
        if engine.boot_id != boot_id:
            print("Engine boot_it is diferent restarting engine")
            sys.exit(1)
            
    return True   
     
heartbeat = HeartbeatTask(
    master_url="http://localhost:3000/master/report-state",
    apply_state=handle_state,
    engine=engine
)

#-----------------------------------------------------------------------------------------------------------------------
# MAIN
#----------------------------------------------------------------------------------------------------------------------- 

def main():
    heartbeat.start()

main()