import time
from core.engine import TradingEngine
from ingestion.pulsar_consumer import PulsarConsumer
from publication.pulsar_publisher import PulsarPublisher

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

consumer = PulsarConsumer(
        service_url="pulsar://localhost:6650",
        topic="persistent://public/default/master.tick",
        subscription="engine-sub"
)

publisher = PulsarPublisher(
    service_url="pulsar://localhost:6650",
    topic="persistent://public/default/engine.state",
)

tick_count = 0

def handle_tick(tick):

    print(tick)

    global tick_count

    tick_count += 1

    if tick_count % 1000 == 0:
        print(f"Procesados {tick_count:,} ticks")

    time.sleep(5)    

    state, signal = engine.on_tick(tick)

    if signal:
        print("SIGNAL:", signal)
    
    publisher.publish(state)

print("Starting...")
consumer.listen(handle_tick)