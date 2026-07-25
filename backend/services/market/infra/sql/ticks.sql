CREATE TABLE ticks
(
    source LowCardinality(String),

    symbol LowCardinality(String),

    id UInt64,

    time UInt64,

    price UInt64,

    qty UInt64,

    is_buyer_maker UInt8
)
ENGINE = MergeTree
PARTITION BY toYYYYMM(toDateTime(time / 1000))
ORDER BY (source, symbol, time)
SETTINGS index_granularity = 8192;