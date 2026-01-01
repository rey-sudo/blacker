# ============================================
# USER STRATEGY FOR HORIZONTALLY SCALABLE PROP FIRM
# NautilusTrader
# ============================================

from decimal import Decimal
from typing import Dict, Any

from nautilus_trader.config import StrategyConfig
from nautilus_trader.trading.strategy import Strategy
from nautilus_trader.core import Data
from nautilus_trader.model import InstrumentId
from nautilus_trader.model.enums import OrderSide
from nautilus_trader.model.orders import MarketOrder


# =====================================================
# STRATEGY CONFIG (1 config = 1 user)
# =====================================================

class UserStrategyConfig(StrategyConfig):
    user_id: str
    instrument_id: InstrumentId
    trade_size: Decimal
    order_id_tag: str   # MUST be unique per user


# =====================================================
# STRATEGY IMPLEMENTATION
# =====================================================

class UserStrategy(Strategy):
    """
    Stateless, horizontally scalable strategy.
    Orders can arrive to ANY pod.
    """

    def __init__(self, config: UserStrategyConfig) -> None:
        super().__init__(config)
        self.instrument = None

    # -------------------------------------------------
    # LIFECYCLE
    # -------------------------------------------------

    def on_start(self) -> None:
        self.instrument = self.cache.instrument(self.config.instrument_id)

        if self.instrument is None:
            self.log.error(f"Instrument not found: {self.config.instrument_id}")
            self.stop()
            return

        self.log.info(
            f"Strategy started | user={self.config.user_id} | "
            f"instrument={self.config.instrument_id}"
        )

    # -------------------------------------------------
    # EXTERNAL SIGNAL ENTRY POINT
    # -------------------------------------------------
    # API / Kafka / Redis → Signal → ANY POD
    # -------------------------------------------------

    def on_signal(self, signal: Data) -> None:
        """
        Expected payload:
        {
            "action": "BUY" | "SELL",
            "quantity": optional Decimal
        }
        """

        payload: Dict[str, Any] = signal.payload

        action = payload.get("action")
        quantity = payload.get("quantity", self.config.trade_size)

        if action == "BUY":
            self._buy(quantity)

        elif action == "SELL":
            self._sell(quantity)

        else:
            self.log.warning(f"Unknown action: {action}")

    # -------------------------------------------------
    # ORDER COMMANDS
    # -------------------------------------------------

    def _buy(self, quantity: Decimal) -> None:
        order: MarketOrder = self.order_factory.market(
            instrument_id=self.config.instrument_id,
            order_side=OrderSide.BUY,
            quantity=self.instrument.make_qty(quantity),
        )
        self.submit_order(order)

    def _sell(self, quantity: Decimal) -> None:
        order: MarketOrder = self.order_factory.market(
            instrument_id=self.config.instrument_id,
            order_side=OrderSide.SELL,
            quantity=self.instrument.make_qty(quantity),
        )
        self.submit_order(order)



class StrategyManager:
    def __init__(self, trader):
        self.trader = trader
        self.strategies = {}

    def add_user(self, user_id: str, instruments: list[str]):
        config = UserStrategyConfig(
            user_id=user_id,
            instrument_ids=instruments,
            order_id_tag=user_id,
        )

        strategy = UserStrategy(config)
        self.trader.add_strategy(strategy)

        self.strategies[user_id] = strategy







# =====================================================
# HOW TO USE THIS STRATEGY
# =====================================================

"""
1) CREATE ONE STRATEGY PER USER
--------------------------------

config = UserStrategyConfig(
    user_id="user_123",
    instrument_id=InstrumentId.from_str("BTCUSDT-PERP.BINANCE"),
    trade_size=Decimal("0.01"),
    order_id_tag="user_123",  # MUST be unique
)

strategy = UserStrategy(config)


2) SEND ORDERS FROM API (ANY POD)
---------------------------------

POST /orders
{
    "user_id": "user_123",
    "action": "BUY",
    "quantity": 0.02
}

API → Kafka / Redis / NATS → Nautilus Signal


3) SIGNAL OBJECT EXAMPLE
------------------------

from nautilus_trader.core import Data

signal = Data(
    payload={
        "action": "BUY",
        "quantity": Decimal("0.02")
    }
)

→ Routed to UserStrategy.on_signal()
→ Order submitted
→ TradingNode executes


4) WHY THIS SCALES
------------------

- No sticky sessions
- Any pod can receive the signal
- State reconstructed from events
- order_id_tag guarantees identity
- TradingNodes act as execution workers
"""
