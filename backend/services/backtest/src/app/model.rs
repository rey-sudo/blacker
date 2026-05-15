use serde::{Serialize, Deserialize};

#[derive(Serialize, Deserialize, Debug)]
pub struct Trade {
    pub id: u64,
    pub price: f64,
    pub qty: f64,
    pub quote_qty: f64,
    pub time: i64,
    pub is_buyer_maker: bool,
    //is_best_match: bool,
}

