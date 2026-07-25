use std::time::Instant;

#[derive(Debug, Clone)]
pub struct Tick {
    /// Exchange de origen
    pub source: String,

    /// Símbolo (BTCUSDT, ETHUSDT...)
    pub symbol: String,

    /// Precio
    pub price: f64,

    /// Cantidad
    pub quantity: f64,

    /// Timestamp del exchange (Unix ms)
    pub event_time: i64,
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

#[derive(Debug, Clone, Copy)]
pub enum Exchange {
    Binance,
    Bybit,
    Okx,
    Kraken,
}