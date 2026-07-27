CREATE TABLE publisher_cursor
(
    publisher String,

    source LowCardinality(String),

    symbol LowCardinality(String),

    last_time UInt64,

    last_id UInt64,

    updated_at UInt64 DEFAULT toUnixTimestamp64Milli(now64(3))
)
ENGINE = ReplacingMergeTree(updated_at)
ORDER BY (publisher, source, symbol);