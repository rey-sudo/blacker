import time
from core.heartbeat_task import HeartbeatTask
from ingestion.tick import Tick
from core.engine import TradingEngine
from ingestion.pulsar_consumer import PulsarConsumer
from publication.pulsar_publisher import PulsarPublisher

consumer = PulsarConsumer(
        service_url="pulsar://localhost:6650",
        topic="persistent://public/default/master.tick",
        subscription="engine-sub",
)

publisher = PulsarPublisher(
    service_url="pulsar://localhost:6650",
    topic="persistent://public/default/engine.state",
)

engine_config = {
  "timeframes": [
    {
      "name": "30m",
      "timeframe_ms": 1800000,
      "series": [ 
        {
          "type": "CandleSeries",
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

engine = TradingEngine.from_config(engine_config)

engine_state = {
  "tick_index": 4,
  "time": 1783209601129,
  "timeframes": {
    "30m": {
      "name": "30m",
      "series": {
        "CandleSeries": {
          "history": [],
          "is_new": True,
          "live": {
            "close": 63114.8,
            "end_ts": 1783211400000,
            "high": 63114.8,
            "low": 63114.8,
            "open": 63114.8,
            "start_ts": 1783209600000,
            "volume": 0.027
          },
          "name": "CandleSeries"
        }
      },
      "timeframe_ms": 1800000
    }
  }
}

def apply_state(data):
    #if engine.state == None
      #engine.set_state(data['engine_state'])
      #return

    #if boot_id != engine.boot_id
      #engine.state = None
      #engine.status = Stopped  
    
    return

def handle_tick(tick: Tick):
    #if !engine.can_listen:
      #NACK ERROR

    #if engine.boot_id != tick.boot_id
      #ACK

    #check if tick_index - 1 != self.tick_index
      #ACK

    time.sleep(5)   

    print(tick.tick_index)

    state, signal = engine.on_tick(tick)

    if signal:
        print("SIGNAL:", signal)
    
    #print(state.to_json())

    publisher.publish(state)

heartbeat = HeartbeatTask(
    master_url="http://localhost:3000/master/report-state",
    apply_state=apply_state,
)

def main():
    heartbeat.start()
    consumer.listen(handle_tick)

main()