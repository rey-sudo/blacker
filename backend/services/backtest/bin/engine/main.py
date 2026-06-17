from core.engine import TradingEngine
from strategy.my_strategy import MyStrategy
from timeframes.aggregator import TimeframeAggregator
from ingestion.pulsar_consumer import PulsarConsumer
from publication.pulsar_publisher import PulsarPublisher

aggregators = [
    TimeframeAggregator(name="1m", timeframe_ms=1 * 60_000),
]

strategy = MyStrategy()

engine = TradingEngine(
    strategy=strategy,
    aggregators=aggregators
)

consumer = PulsarConsumer(
        service_url="pulsar://localhost:6650",
        topic="persistent://public/default/ticks",
        subscription="backtest-engine"
)

publisher = PulsarPublisher(
    service_url="pulsar://localhost:6650",
    topic="persistent://public/default/engine.state",
)

def handle_tick(tick):
    state, signal = engine.on_tick(tick)

    if signal:
        print("SIGNAL:", signal)
    
    publisher.publish(state)

print("Starting...")

consumer.listen(handle_tick)