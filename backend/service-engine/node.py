# node.py
from nautilus_trader.config import TradingNodeConfig
from nautilus_trader.live.config import (
    LiveDataClientConfig,
    LiveExecClientConfig,
    RoutingConfig,
)
from nautilus_trader.live.node import TradingNode


def create_trading_node() -> TradingNode:
    """
    Crea un TradingNode listo para una PROP FIRM (CFD / Live / Paper)
    """

    config = TradingNodeConfig(
        trader_id="PROP-FIRM-001",

        # ----------------------------
        # DATA CLIENT (market data)
        # ----------------------------
        data_clients={
            "PROP_DATA": LiveDataClientConfig(
                routing=RoutingConfig(
                    venues={"PROP"},   # 👈 venue implícito
                    default=True,
                )
            )
        },

        # ----------------------------
        # EXEC CLIENT (ordenes)
        # ----------------------------
        exec_clients={
            "PROP_EXEC": LiveExecClientConfig(
                routing=RoutingConfig(
                    venues={"PROP"},   # 👈 mismo venue
                    default=True,
                )
            )
        },
    )

    node = TradingNode(config=config)
    return node
