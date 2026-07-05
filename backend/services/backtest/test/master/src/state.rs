use std::{
    collections::HashMap,
    sync::Arc,
};
use std::time::Instant;
use tokio::sync::RwLock;

#[derive(Debug, Clone)]
pub struct SlaveStatus {
    pub connected: bool,
    pub last_seen: Instant,
    pub status: String,
}

#[derive(Clone)]
pub struct AppState {
    pub slaves: Arc<RwLock<HashMap<String, SlaveStatus>>>,
}

impl AppState {
    pub fn new() -> Self {
        Self {
            slaves: Arc::new(RwLock::new(HashMap::new())),
        }
    }
}