use crate::tick::Tick; 

#[derive(Debug, Clone)]
pub struct Candle {
    pub ts: i64,          // inicio del intervalo
    pub open: f64,
    pub high: f64,
    pub low: f64,
    pub close: f64,
    pub volume: f64,

    // info de ticks reales
    pub first_tick_ts: i64,
    pub last_tick_ts: i64,
    pub first_trade_id: i64,
    pub last_trade_id: i64,
}

impl Candle {
    pub fn new(bucket_ts: i64, tick: &Tick) -> Self {
        Self {
            ts: bucket_ts,
            open: tick.p,
            high: tick.p,
            low: tick.p,
            close: tick.p,
            volume: tick.q,

            first_tick_ts: tick.T,
            last_tick_ts: tick.T,
            first_trade_id: tick.f,
            last_trade_id: tick.l,
        }
    }

    pub fn update(&mut self, tick: &Tick) {
        self.high = self.high.max(tick.p);
        self.low = self.low.min(tick.p);
        self.volume += tick.q;

        if tick.T < self.first_tick_ts {
            self.first_tick_ts = tick.T;
            self.first_trade_id = tick.f;
            self.open = tick.p;
        }

        if tick.T > self.last_tick_ts {
            self.last_tick_ts = tick.T;
            self.last_trade_id = tick.l;
            self.close = tick.p;
        }
    }
}
