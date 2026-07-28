CREATE TABLE kv_store (
    key String,
    value String,
    updated_at DateTime64(6) DEFAULT now64(6)
)
ENGINE = ReplacingMergeTree(updated_at)
ORDER BY key;