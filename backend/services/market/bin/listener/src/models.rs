use std::time::Instant;

#[derive(Debug, Clone)]
pub struct Tick {
    pub source: String,
    pub id: u64,
    pub time: u64,
    pub price: u64,
    pub qty: u64,
    pub is_buyer_maker: u8,
}