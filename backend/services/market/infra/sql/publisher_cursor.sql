CREATE TABLE publisher_cursor
(
    publisher String,

    source LowCardinality(String),

    symbol LowCardinality(String),

    last_time UInt64,

    last_id String,

    updated_at UInt64 DEFAULT toUnixTimestamp64Nano(now64(9))
)
ENGINE = ReplacingMergeTree(updated_at)
ORDER BY (publisher, source, symbol);