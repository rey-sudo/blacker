use std::sync::Arc;
use dashmap::DashMap;
use tokio::sync::mpsc;
use pulsar::producer;
use crate::application::types::{ContextId, Symbol, Timeframe};

pub type WsSender = mpsc::Sender<Arc<producer::Message>>;

#[derive(Clone)]
pub struct AppState {
    /// context_id -> websocket sender
    pub ws_registry: Arc<DashMap<ContextId, WsSender>>,

    /// (symbol, timeframe) -> list of websocket senders
    pub ohlcv_subs: Arc<DashMap<(Symbol, Timeframe), Vec<WsSender>>>,
}

impl AppState {
    pub fn new() -> Self {
        Self {
            ws_registry: Arc::new(DashMap::new()),
            ohlcv_subs: Arc::new(DashMap::new()),
        }
    }
}