use std::sync::Arc;
use tokio::sync::RwLock;
use crate::models::User;

#[derive(Clone)]
pub struct AppState {
    pub users: Arc<RwLock<Vec<User>>>,
}

impl AppState {
    pub fn new(db: String) -> Self {
        Self {
            users: Arc::new(RwLock::new(Vec::new())),
        }
    }
}
