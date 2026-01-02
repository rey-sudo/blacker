# ============================================
# USER STRATEGY FOR HORIZONTALLY SCALABLE PROP FIRM
# NautilusTrader
# ============================================

from decimal import Decimal
from typing import Dict, Any, Optional, List
import json

from nautilus_trader.config import StrategyConfig
from nautilus_trader.trading.strategy import Strategy
from nautilus_trader.core import Data
from nautilus_trader.model import InstrumentId
from nautilus_trader.model.enums import OrderSide
from nautilus_trader.model.orders import MarketOrder
from nautilus_trader.model import CustomData
from nautilus_trader.common.component import LiveClock
from nautilus_trader.common.component import Logger


class UserStrategyConfig(StrategyConfig):
    user_id: str
    instrument_ids: List[InstrumentId]
    trade_size: Decimal = Decimal("0.01")
    order_id_tag: str



class UserStrategy(Strategy):
    def __init__(self, config: UserStrategyConfig) -> None:
        
        super().__init__(config)
        
        self.instruments = {}
        
    def on_start(self) -> None:
             
        self.log.info(
            f"UserStrategy starting | user={self.config.user_id} | "
            f"instruments={list(self.instruments.keys())}"
        )
  
        for instrument_id in self.config.instrument_ids:
            
            instrument = self.cache.instrument(InstrumentId.from_str(instrument_id))

            if instrument is None:
                self.log.error(f"Instrument not found: {instrument_id}")
                self.stop()
                return

            self.instruments[instrument_id] = instrument

        self.log.info(
            f"UserStrategy started | user={self.config.user_id} | "
            f"instruments={list(self.instruments.keys())}"
        )

    def on_signal(self, signal) -> None:
        self.log.info(
            f"Signal received | signal={signal}"
        )
                
        payload = json.loads(signal.value)
         
        instrument_id = payload["instrument_id"] 
        action = payload["action"]
        quantity = payload.get("quantity", self.config.trade_size)

        if instrument_id not in self.config.instrument_ids:
            self.log.warning(
                f"User {self.config.user_id} not allowed to trade {instrument_id}"
            )
            return
        
        instrument = self.instruments[instrument_id]
        
        if action == "BUY":
            self._buy(instrument, quantity)
        elif action == "SELL":
            self._sell(instrument, quantity)
        else:
            self.log.warning(f"Unknown action {action}")

    def _buy(self, instrument, quantity):
        order = self.order_factory.market(
            instrument_id=instrument.id(),
            order_side=OrderSide.BUY,
            quantity=instrument.make_qty(quantity),
        )
        self.submit_order(order)

    def _sell(self, instrument, quantity):
        order = self.order_factory.market(
            instrument_id=instrument.id(),
            order_side=OrderSide.SELL,
            quantity=instrument.make_qty(quantity),
        )
        self.submit_order(order)
        


class StrategyManager:
    def __init__(self, trader):
        self.trader = trader
        self.strategies: dict[str, UserStrategy] = {}
        self.log = Logger(name="StrategyManager")

    def add_user(self, user_id: str, instrument_ids: set[str], trade_size=0.01):
        if user_id in self.strategies:
            return  

        self.log.info(
            f"Adding user | user={user_id} | instruments={instrument_ids}"
        )

        config = UserStrategyConfig(
            user_id=user_id,
            instrument_ids=instrument_ids, 
            trade_size=trade_size,
            order_id_tag=user_id
        )

        strategy = UserStrategy(config)
        self.trader.add_strategy(strategy)
        
        self.strategies[user_id] = strategy
        
        self.log.info(f"User added | user={user_id} | instruments={instrument_ids}")

    def send_order(self, user_id: str, action: str, instrument_id: str, quantity=None):
        if user_id not in self.strategies:
            raise ValueError(f"User {user_id} not found")

        strategy = self.strategies[user_id]

        payload = {
            "action": action,
            "quantity": quantity,
            "instrument_id": instrument_id
        }

        strategy.publish_signal(
          name="user.order",
          value=json.dumps(payload)
        )
        
        self.log.info(
            f"Signal published | user={user_id} | instrument_id={instrument_id}"
        )


