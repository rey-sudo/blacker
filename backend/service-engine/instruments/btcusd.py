from decimal import Decimal
from time import time_ns

from nautilus_trader.model.enums import AssetClass
from nautilus_trader.model.identifiers import InstrumentId, Symbol
from nautilus_trader.model.instruments import Cfd
from nautilus_trader.model.objects import Currency, Price, Quantity, Money
from nautilus_trader.model.tick_scheme import FixedTickScheme, register_tick_scheme


# Timestamp actual
ts = time_ns()

# Registrar un tick scheme personalizado
btc_tick_scheme = FixedTickScheme(
    name="BTCUSD_PROP_TICKS",
    price_precision=2,                  # precisión de precio
    min_tick=Price.from_str("0.01"),    # tick mínimo
    max_tick=Price.from_str("1000000"), # tick máximo permitido
)

register_tick_scheme(btc_tick_scheme)


usd = Currency.from_str("USD")


btc_usd_cfd = Cfd(
    instrument_id=InstrumentId.from_str("BTCUSD.PROP"),
    raw_symbol=Symbol("BTCUSD"),
    asset_class=AssetClass.CRYPTOCURRENCY,
    quote_currency=usd,
    price_precision=2,
    size_precision=3,
    price_increment=Price.from_str("0.01"),
    size_increment=Quantity.from_str("0.001"),
    ts_event=ts,
    ts_init=ts,
    lot_size=Quantity.from_str("0.001"),
    min_quantity=Quantity.from_str("0.001"),
    max_quantity=Quantity.from_str("100"),
    min_notional=Money.from_raw(1000, usd),      
    max_notional=Money.from_raw(10_000_000, usd),
    margin_init=Decimal("0.01"),
    margin_maint=Decimal("0.005"),
    maker_fee=Decimal("0.0002"),
    taker_fee=Decimal("0.0005"),
    tick_scheme_name=btc_tick_scheme.name,        
    base_currency = Currency.from_str("BTC"), 
    max_price = Price.from_str("100000"), 
    min_price = Price.from_str("1"),
    info={"venue": "PROP", "type": "CFD"}
)
