\c service_ingest

CREATE TABLE
    IF NOT EXISTS ohlcv_1m (
        symbol TEXT NOT NULL,
        open DOUBLE PRECISION NOT NULL,
        high DOUBLE PRECISION NOT NULL,
        low DOUBLE PRECISION NOT NULL,
        close DOUBLE PRECISION NOT NULL,
        volume DOUBLE PRECISION NOT NULL,
        trade_count INTEGER NOT NULL,
        timestamp BIGINT NOT NULL,
        minute_ts BIGINT NOT NULL,
        last_trade_ts BIGINT NOT NULL,
        PRIMARY KEY (symbol, minute_ts)
    );

CREATE INDEX IF NOT EXISTS idx_ohlcv_1m_symbol ON ohlcv_1m (symbol);

CREATE INDEX IF NOT EXISTS idx_ohlcv_1m_minute_ts ON ohlcv_1m (minute_ts);