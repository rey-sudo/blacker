use std::sync::Arc;

use crate::{config::Config, infrastructure::database::Database};

#[derive(Clone)]
pub struct AppState {
    pub config: Arc<Config>,
    pub db: Arc<Database>,
}
