CREATE TABLE IF NOT EXISTS instruments (
    id UUID PRIMARY KEY,
    internal_id TEXT NOT NULL,
    idempotent_id TEXT NOT NULL,
    symbol TEXT NOT NULL,
    symbol_display TEXT NOT NULL,
    description TEXT NOT NULL,
    base TEXT NOT NULL,
    quote TEXT NOT NULL,
    exchange TEXT NOT NULL,
    exchange_country CHAR(2) NOT NULL,
    market TEXT NOT NULL,
    type TEXT NOT NULL,
    provider_name TEXT NOT NULL,
    provider_id TEXT NOT NULL,
    provider_symbol TEXT NOT NULL,
    status TEXT NOT NULL,
    is_hidden BOOLEAN NOT NULL,
    is_synthetic BOOLEAN NOT NULL,
    isin TEXT,
    cusip TEXT,
    tick_size NUMERIC NOT NULL,
    step_size NUMERIC,
    price_precision INT NOT NULL,
    quantity_precision INT,
    min_quantity NUMERIC NOT NULL,
    max_quantity NUMERIC NOT NULL,
    min_order_value NUMERIC NOT NULL,
    max_order_value NUMERIC NOT NULL,
    lot_size NUMERIC,
    contract_size NUMERIC,
    display_decimals INT NOT NULL,
    leverage NUMERIC,
    leverage_max NUMERIC,
    supported_margin_types TEXT[], 
    initial_margin NUMERIC,
    maintenance_margin NUMERIC,
    expiry_date TIMESTAMP,
    settlement_type TEXT,
    settlement_delay TEXT,
    price_multiplier NUMERIC,
    pricing_currency TEXT,
    underlying_asset TEXT,
    settlement_currency TEXT,
    trading_hours JSONB,
    extended_hours JSONB,
    circuit_breaker JSONB,
    supported_order_types TEXT[],
    tags TEXT[],
    priority INT,
    icon_url TEXT NOT NULL,
    highlight_color TEXT NOT NULL,
    symbol_aliases TEXT[],
    full_text_search TEXT,
    fee_tier TEXT,
    maker_fee NUMERIC NOT NULL,
    taker_fee NUMERIC NOT NULL,
    typical_spread NUMERIC,
    is_tradable BOOLEAN NOT NULL,
    requires_kyc BOOLEAN NOT NULL,
    supports_futures BOOLEAN,
    regulation TEXT,
    timezone TEXT NOT NULL,
    created_at BIGINT NOT NULL,
    updated_at BIGINT NOT NULL,
    symbol_lc TEXT NOT NULL,
    search_terms TEXT[],
    supported_timeframes TEXT[],
    supports_ohlcv BOOLEAN NOT NULL,
    restricted_countries TEXT[],

    created_at BIGINT NOT NULL,
    updated_at BIGINT NOT NULL,
    deleted_at BIGINT,

    version BIGINT NOT NULL DEFAULT 0

);


CREATE INDEX idx_instruments_symbol ON instruments(symbol);

CREATE INDEX idx_instruments_exchange ON instruments(exchange);

CREATE INDEX idx_instruments_market ON instruments(market);

CREATE INDEX idx_instruments_type ON instruments(type);

CREATE INDEX idx_instruments_status ON instruments(status);

CREATE INDEX idx_instruments_provider_id ON instruments(provider_id);

CREATE INDEX idx_instruments_provider_symbol ON instruments(provider_symbol);

CREATE INDEX idx_instruments_created_at ON instruments(created_at);

CREATE INDEX idx_instruments_updated_at ON instruments(updated_at);

CREATE INDEX idx_instruments_version ON instruments(version);
