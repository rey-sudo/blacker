from decimal import Decimal
from time import time_ns

from nautilus_trader.model.enums import AssetClass
from nautilus_trader.model.identifiers import InstrumentId, Symbol
from nautilus_trader.model.instruments import Cfd
from nautilus_trader.model.objects import Currency, Price, Quantity

ts = time_ns()

btc_usd_cfd = Cfd(
    instrument_id=InstrumentId.from_str("BTCUSD.PROP"),
    raw_symbol=Symbol("BTCUSD"),
    asset_class=AssetClass.CRYPTOCURRENCY,
    quote_currency=Currency.from_str("USD"),
    price_precision=2,
    size_precision=3,
    price_increment=Price.from_str("0.01"),
    size_increment=Quantity.from_str("0.001"),
    ts_event=ts,
    ts_init=ts,
    lot_size=Quantity.from_str("0.001"),
    min_quantity=Quantity.from_str("0.001"),
    max_quantity=Quantity.from_str("100"),
    margin_init=Decimal("0.01"),
    margin_maint=Decimal("0.005"),
    maker_fee=Decimal("0.0002"),
    taker_fee=Decimal("0.0005"),
    info={"venue": "PROP", "type": "CFD"}
)
