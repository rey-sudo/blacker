from nautilus_trader.model.identifiers import Venue
from nautilus_trader.model.instruments import Cfd
from nautilus_trader.model.identifiers import InstrumentId, Venue
from nautilus_trader.model.currencies import Currency
from nautilus_trader.model.objects import Price, Quantity
from nautilus_trader.model.currencies import BTC, USD

def create_cfd_instrument(
    symbol: str,
    venue: Venue,
    base_currency: Currency,
    quote_currency: Currency,
    price_precision: int,
    size_precision: int,
    tick_size: str,
    lot_size: str,
    min_qty: str,
    max_qty: str,
    contract_multiplier: float = 1.0,
    margin_init: float = 0.10,
    margin_maint: float = 0.05,
) -> Cfd:
    """
    Factory for institutional-style CFD instruments.
    """

    return Cfd(
        instrument_id=InstrumentId.from_str(f"{symbol}.{venue.value}"),
        symbol=symbol,
        venue=venue,
        base_currency=base_currency,
        quote_currency=quote_currency,
        contract_multiplier=contract_multiplier,
        price_precision=price_precision,
        size_precision=size_precision,
        tick_size=Price.from_str(tick_size),
        lot_size=Quantity.from_str(lot_size),
        min_quantity=Quantity.from_str(min_qty),
        max_quantity=Quantity.from_str(max_qty),
        margin_init=margin_init,
        margin_maint=margin_maint,
        maker_fee=0.0,
        taker_fee=0.0,
    )



CFD_VENUE = Venue("CFD_INST")

btc_cfd = create_cfd_instrument(
    symbol="BTCUSD",
    venue=CFD_VENUE,
    base_currency=BTC,
    quote_currency=USD,
    price_precision=2,
    size_precision=3,
    tick_size="0.01",
    lot_size="0.001",
    min_qty="0.001",
    max_qty="500",
)
