from core.engine import TradingEngine
from strategy.my_strategy import MyStrategy
from timeframes.aggregator import TimeframeAggregator
from ingestion.redis_consumer import RedisConsumer

engine = TradingEngine(
    strategy=MyStrategy(),
    agg_5m=TimeframeAggregator(5 * 60_000),
    agg_30m=TimeframeAggregator(30 * 60_000),
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