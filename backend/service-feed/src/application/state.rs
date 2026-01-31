use crate::{
    application::types::{ContextId, IndicatorSpec, Symbol},
    common::candle::Timeframe,
};
use dashmap::DashMap;
use serde_json::Value;
use std::sync::Arc;
use tokio::sync::mpsc;

pub type WsSender = mpsc::Sender<Arc<Value>>;

pub struct Chart {
    pub context_id: ContextId,
    pub symbol: Symbol,
    pub timeframe: Timeframe,
    
    pub ws_sender: WsSender,
    pub indicators: Vec<IndicatorSpec>,

    pub from: i64,
    pub to: i64,  
    pub cursor: i64,
    pub length: usize,
}

#[derive(Clone)]

pub struct AppState {
    /// context_id -> Chart
    pub charts: Arc<DashMap<ContextId, Chart>>,

    /// (symbol, timeframe) -> Vec<context_id>
    pub ohlcv_index: Arc<DashMap<(Symbol, Timeframe), Vec<ContextId>>>,
}

impl AppState {
    pub fn new() -> Self {
        Self {
            charts: Arc::new(DashMap::new()),
            ohlcv_index: Arc::new(DashMap::new()),
        }
    }
}
