from core.engine import TradingEngine
from strategy.my_strategy import MyStrategy
from timeframes.aggregator import TimeframeAggregator
from ingestion.redis_consumer import RedisConsumer
from publication.redis_publisher import RedisPublisher

aggregators = [
    TimeframeAggregator(name="1m", timeframe_ms=1 * 60_000),
]

strategy = MyStrategy()

engine = TradingEngine(
    strategy=strategy,
    aggregators=aggregators
)

consumer = RedisConsumer(
    stream="backtester:tick:stream",
    group="backtest_group",
    consumer="consumer_1"
)

publisher = RedisPublisher(stream="backtester:engine:stream")

def handle_tick(tick):
    state, signal = engine.on_tick(tick)

    #if signal:
        #print("SIGNAL:", signal)
    
    publisher.publish(state)

print("Starting...")

#publisher.purge_stream()
consumer.listen(handle_tick)