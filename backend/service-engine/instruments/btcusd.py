from decimal import Decimal
from time import time_ns

from nautilus_trader.model.enums import AssetClass
from nautilus_trader.model.identifiers import InstrumentId, Symbol
from nautilus_trader.model.instruments import Cfd
from nautilus_trader.model.objects import Currency, Price, Quantity, Money

ts = time_ns()

usd = Currency.from_str("USD")

btc_usd_cfd = Cfd(
    instrument_id=InstrumentId.from_str("BTCUSD.PROP"),
    raw_symbol=Symbol("BTCUSD"),
    asset_class=AssetClass.CRYPTOCURRENCY,
    quote_currency=Currency.from_str("USD"),
    base_currency=Currency.from_str("BTC"),
    price_precision=2,
    size_precision=3,
    price_increment=Price.from_str("0.01"),
    size_increment=Quantity.from_str("0.001"),
    ts_event=ts,
    ts_init=ts,
    lot_size=Quantity.from_str("0.001"),
    min_quantity=Quantity.from_str("0.001"),
    max_quantity=Quantity.from_str("100"),
    min_notional = Money.from_raw(1000, usd),    
    max_notional = Money.from_raw(1_000_000, usd),
    min_price=Price.from_str("10000"),        # precio mínimo permitido
    max_price=Price.from_str("200000"),       # precio máximo permitido
    margin_init=Decimal("0.01"),              # 1% margen inicial
    margin_maint=Decimal("0.005"),            # 0.5% margen de mantenimiento
    maker_fee=Decimal("0.0002"),              # comisión maker
    taker_fee=Decimal("0.0005"),              # comisión taker
    tick_scheme_name="STANDARD",
    info={"venue": "PROP", "type": "CFD"}
)
