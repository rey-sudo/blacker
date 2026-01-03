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
from nautilus_trader.core import Data
from nautilus_trader.core.message import Event
from nautilus_trader.common.actor import Actor
from nautilus_trader.config import ActorConfig

from dataclasses import dataclass
from collections import deque



        
class ApiGatewayConfig(ActorConfig):
    name: str = "api-gateway"


class ApiGatewayActor(Actor):
    def __init__(self, config: ApiGatewayConfig):
        super().__init__(config)

    def on_start(self):
        self.log.info("API Gateway Actor started")

    def publish_order(self, event):
        self.log.info("publishing event")
        
        self.msgbus.publish(event.TOPIC, event)


@dataclass
class UserOrderEvent(Event):
    user_id: str
    instrument_id: InstrumentId
    action: str
    quantity: Optional[Decimal] = None

    TOPIC: str = "user.order"
        
                    
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
            
        self.log.info(f"UserStrategy starting | user={self.config.user_id}")
        
        self.msgbus.subscribe(UserOrderEvent.TOPIC, self.on_user_order)
        self.log.info("Subscribed to UserOrderEvent")
    
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

    def on_user_order(self, event: UserOrderEvent):
        self.log.info("@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@")
        
        self.log.info(
            f"User order | user={event.user_id} | "
            f"{event.action} {event.quantity} {event.instrument_id}"
        )

        instrument = self.instruments.get(event.instrument_id.value)
        if instrument is None:
            self.log.warning("Instrument not allowed")
            return

        qty = event.quantity or self.config.trade_size
        
        self.log.info(f"Submmiting order {instrument.id}")

        if event.action == "BUY":
            self._buy(instrument, qty)
        elif event.action == "SELL":
            self._sell(instrument, qty)


    def on_signal(self, signal: Data) -> None:
        self.log.info(
            f"Signal received | signal={signal}"
        )
                

    def _buy(self, instrument, quantity):
        order = self.order_factory.market(
            instrument_id=instrument.id,
            order_side=OrderSide.BUY,
            quantity=instrument.make_qty(quantity),
        )
        
        self.submit_order(order)
        self.log.info("Buy order submitted")
 
    def _sell(self, instrument, quantity):
        order = self.order_factory.market(
            instrument_id=instrument.id,
            order_side=OrderSide.SELL,
            quantity=instrument.make_qty(quantity),
        )
        
        self.submit_order(order)
        self.log.info("Sell order submitted")
        
        
        


class StrategyManager:
    def __init__(self, trader):
        self.trader = trader
        self.strategies: dict[str, UserStrategy] = {}
        self.log = Logger(name="StrategyManager")


    def _find_user_strategy(self, user_id: str) -> UserStrategy:
        for strategy in self.trader.strategies():
            if strategy.order_id_tag == user_id:
                return strategy
        raise ValueError(f"Strategy for user {user_id} not found")


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
        
        
        gateway_config = ApiGatewayConfig()
        gateway = ApiGatewayActor(gateway_config)
    
        self.trader.add_actor(gateway)
        
        self.log.info(f"User added | user={user_id} | instruments={instrument_ids}")

    def send_order(self, user_id: str, action: str, instrument_id: str, quantity=None):

       
        strategy = self._find_user_strategy(user_id)

        event = UserOrderEvent(
            user_id=user_id,
            instrument_id=InstrumentId.from_str(instrument_id),
            action=action,
            quantity=quantity,
        )
        
        actor = self.trader.actors()[0]
        
        actor.publish_order(event)

        self.log.info(f"Order dispatched | user={user_id}")
        


