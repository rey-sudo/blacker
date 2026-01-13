use xxhash_rust::xxh3::xxh3_64;


/// Deterministic sharding function
pub fn belongs_to_shard(symbol: &str, shard_id: u32, total_shards: u32) -> bool {
    (xxh3_64(symbol.as_bytes()) % total_shards as u64) == shard_id as u64
}