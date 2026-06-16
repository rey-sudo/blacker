use bytemuck::{Pod, Zeroable};


#[repr(C)]
#[derive(Clone, Copy, Debug, Zeroable, Pod)]
pub struct Trade {
    pub trade_id: u64,
    pub price: u64,
    pub qty: u64,
    pub timestamp_ms: u64, //normalize
    pub is_buyer_maker: u8,
    pub _padding: [u8; 7],
}