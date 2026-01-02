# ============================================
# USER STRATEGY FOR HORIZONTALLY SCALABLE PROP FIRM
# NautilusTrader
# ============================================

from decimal import Decimal
from typing import Dict, Any, Optional

from nautilus_trader.config import StrategyConfig
from nautilus_trader.trading.strategy import Strategy
from nautilus_trader.core import Data
from nautilus_trader.model import InstrumentId
from nautilus_trader.model.enums import OrderSide
from nautilus_trader.model.orders import MarketOrder
from nautilus_trader.model import CustomData
from nautilus_trader.common.component import LiveClock

# =====================================================
# STRATEGY CONFIG (1 config = 1 user)
# =====================================================

class UserStrategyConfig(StrategyConfig):
    user_id: str
    instrument_id: InstrumentId
    trade_size: Decimal
    order_id_tag: str   # MUST be unique per user





class UserSignal(CustomData):
    def __init__(self, action: str, quantity: Optional[Decimal] = None):
        super().__init__("USER_SIGNAL") 
        self.action = action
        self.quantity = quantity




class UserStrategy(Strategy):

    def on_start(self) -> None:
        self.instrument = self.cache.instrument(self.config.instrument_id)
        
        if not self.instrument:
            self.log.error("Instrument not found")
            self.stop()
            return

        self.subscribe_signal("user.order")

        self.log.info(
            f"Strategy started | user={self.config.user_id} | "
            f"instrument={self.config.instrument_id}"
        )


    def on_signal(self, signal) -> None:
        """
        signal.value expected:
        {
          "action": "BUY" | "SELL",
          "quantity": optional
        }
        """
        payload = signal.value
        action = payload["action"]
        quantity = payload.get("quantity", self.config.trade_size)

        if action == "BUY":
            self._buy(quantity)
        elif action == "SELL":
            self._sell(quantity)
        else:
            self.log.warning(f"Unknown action {action}")

    def _buy(self, quantity):
        order = self.order_factory.market(
            instrument_id=self.config.instrument_id,
            order_side=OrderSide.BUY,
            quantity=self.instrument.make_qty(quantity),
        )
        self.submit_order(order)

    def _sell(self, quantity):
        order = self.order_factory.market(
            instrument_id=self.config.instrument_id,
            order_side=OrderSide.SELL,
            quantity=self.instrument.make_qty(quantity),
        )
        self.submit_order(order)
        


class StrategyManager:
    def __init__(self, trader):
        self.trader = trader
        self.strategies: dict[str, UserStrategy] = {}

    def add_user(self, user_id: str, instruments: list[str], trade_size=0.01):
        if user_id in self.strategies:
            return  # idempotente

        config = UserStrategyConfig(
            user_id=user_id,
            instrument_id=instruments, 
            trade_size=trade_size,
            order_id_tag=user_id
        )

        strategy = UserStrategy(config)
        self.trader.add_strategy(strategy)
        self.strategies[user_id] = strategy

    def send_order(self, user_id: str, action: str, quantity=None):
        if user_id not in self.strategies:
            raise ValueError(f"User {user_id} not found")

        strategy = self.strategies[user_id]

        payload = {
            "action": action,
            "quantity": quantity,
        }

        strategy.publish_signal(
            name="user.order",
            value=payload,
        )







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
