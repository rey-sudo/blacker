from nautilus_trader.model.instruments import ForexPair
from nautilus_trader.model.identifiers import InstrumentId

eurusd = ForexPair(
    instrument_id=InstrumentId.from_str("EUR/USD"),
    symbol="EUR/USD",
    base_currency="EUR",
    quote_currency="USD",
    price_precision=5,
    size_precision=0,
)

node.data_engine.add_instrument(eurusd)
