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

#[derive(Debug)]
pub struct TickBatch {
    /// Ticks del lote
    pub ticks: Vec<Tick>,

    /// Momento en que se creó el batch
    pub created_at: Instant,
}

impl TickBatch {
    pub fn new(capacity: usize) -> Self {
        Self {
            ticks: Vec::with_capacity(capacity),
            created_at: Instant::now(),
        }
    }

    pub fn push(&mut self, tick: Tick) {
        self.ticks.push(tick);
    }

    pub fn len(&self) -> usize {
        self.ticks.len()
    }

    pub fn is_empty(&self) -> bool {
        self.ticks.is_empty()
    }

    pub fn clear(&mut self) {
        self.ticks.clear();
        self.created_at = Instant::now();
    }
}
