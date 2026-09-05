from dataclasses import dataclass, field
from enum import Enum
from typing import Optional


class Side(str, Enum):
    BUY = "BUY"
    SELL = "SELL"


class OrderType(str, Enum):
    MARKET = "MARKET"
    LIMIT = "LIMIT"


@dataclass
class Signal:
    action: str  # "BUY" | "EXIT"

    quantity: Optional[float] = None

    # Entrada
    order_type: OrderType = OrderType.MARKET
    price: Optional[float] = None

    # Targets de salida
    targets: list[float] = field(default_factory=list)


@dataclass
class Order:
    id: int
    side: Side
    type: OrderType
    quantity: float
    price: Optional[float] = None

    # "ENTRY", "TARGET", "EXIT"
    role: str = "ENTRY"


@dataclass
class Fill:
    order: Order
    price: float
    quantity: float


class OrderManager:

    def __init__(self):
        self._next_id = 0

        # Targets que pertenecen a la entrada pendiente.
        self._pending_targets: list[float] = []

        # Órdenes que están actualmente activas.
        self._active_orders: dict[int, Order] = {}

    def _new_order(
        self,
        side: Side,
        order_type: OrderType,
        quantity: float,
        price: Optional[float],
        role: str,
    ) -> Order:

        self._next_id += 1

        order = Order(
            id=self._next_id,
            side=side,
            type=order_type,
            quantity=quantity,
            price=price,
            role=role,
        )

        self._active_orders[order.id] = order

        return order

    def handle(
        self,
        state: "EngineState",        
        signal: Optional[Signal],

    ) -> list[Order]:

        if signal is None:
            return []

        if signal.action == "BUY":
            return self._handle_buy(signal, state)

        if signal.action == "EXIT":
            return self._handle_exit(state)

        raise ValueError(
            f"Unknown signal action: {signal.action}"
        )

    def _handle_buy(
        self,
        signal: Signal,
        state: "EngineState",
    ) -> list[Order]:

        # El motor solo permite una posición.
        if state.position is not None:
            return []

        if signal.quantity is None:
            raise ValueError("BUY signal requires quantity")

        self._pending_targets = list(signal.targets)

        return [
            self._new_order(
                side=Side.BUY,
                order_type=signal.order_type,
                quantity=signal.quantity,
                price=signal.price,
                role="ENTRY",
            )
        ]

    def _handle_exit(
        self,
        state: "EngineState",
    ) -> list[Order]:

        if state.position is None:
            return []

        # Una salida inmediata invalida todos los targets.
        self.cancel_targets()

        return [
            self._new_order(
                side=Side.SELL,
                order_type=OrderType.MARKET,
                quantity=state.position.quantity,
                price=None,
                role="EXIT",
            )
        ]

    def on_fill(self, fill: Fill) -> list[Order]:

        order = fill.order

        # La orden ya no está pendiente.
        self._active_orders.pop(order.id, None)

        # Si fue la entrada, ahora sí podemos colocar los targets.
        if order.role == "ENTRY":
            return self._create_targets(
                quantity=fill.quantity,
            )

        return []

    def _create_targets(
        self,
        quantity: float,
    ) -> list[Order]:

        targets = self._pending_targets

        if not targets:
            self._pending_targets.clear()
            return []

        orders = []

        base_quantity = quantity / len(targets)

        for index, price in enumerate(targets):

            # El último target absorbe cualquier diferencia.
            if index == len(targets) - 1:
                used = sum(o.quantity for o in orders)
                target_quantity = quantity - used
            else:
                target_quantity = base_quantity

            orders.append(
                self._new_order(
                    side=Side.SELL,
                    order_type=OrderType.LIMIT,
                    quantity=target_quantity,
                    price=price,
                    role="TARGET",
                )
            )

        self._pending_targets.clear()

        return orders

    def cancel_targets(self) -> list[Order]:

        cancelled = []

        for order_id, order in list(self._active_orders.items()):

            if order.role == "TARGET":
                cancelled.append(order)
                del self._active_orders[order_id]

        return cancelled

    def active_orders(self) -> list[Order]:
        return list(self._active_orders.values())