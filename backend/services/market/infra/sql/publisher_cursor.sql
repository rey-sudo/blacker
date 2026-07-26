CREATE TABLE publisher_cursor
(
    source LowCardinality(String),

    last_time UInt64,
    last_id UInt64,

    updated_at DateTime64(3) DEFAULT now64(3)
)
ENGINE = ReplacingMergeTree(updated_at)
ORDER BY source;