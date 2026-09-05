CREATE TABLE kv_store (
    key String,
    value String,
    updated_at UInt64 DEFAULT toUnixTimestamp64Nano(now64(9))
)
ENGINE = ReplacingMergeTree(updated_at)
ORDER BY key;