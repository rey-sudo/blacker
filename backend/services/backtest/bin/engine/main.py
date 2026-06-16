from core.engine import TradingEngine
from strategy.my_strategy import MyStrategy
from timeframes.aggregator import TimeframeAggregator
from ingestion.redis_consumer import RedisConsumer

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

def handle_tick(tick):
    signal = engine.on_tick(tick)

    if signal:
        print("SIGNAL:", signal)

consumer.listen(handle_tick)