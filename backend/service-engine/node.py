# node.py
from nautilus_trader.config import (
    TradingNodeConfig,
    CacheConfig,
    MessageBusConfig,
    PortfolioConfig,
    DatabaseConfig,
    LiveDataEngineConfig,
    LiveRiskEngineConfig,
    LiveExecEngineConfig,
)

from nautilus_trader.live.node import TradingNode


def create_trading_node() -> TradingNode:
    config = TradingNodeConfig(
        trader_id="PROP-FIRM-001",

        cache=CacheConfig(
            database=DatabaseConfig(timeout=2.0),
        ),

        message_bus=MessageBusConfig(
            database=DatabaseConfig(timeout=2.0),
        ),

        data_engine=LiveDataEngineConfig(),
        risk_engine=LiveRiskEngineConfig(),
        exec_engine=LiveExecEngineConfig(),
        portfolio=PortfolioConfig(),
    )

    node = TradingNode(config=config)
    return node
