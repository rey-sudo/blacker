pub mod handlers;

use axum::{Router, routing::get};

use crate::application::state::AppState;

pub fn router() -> Router<AppState> {
    Router::new().route("/get-ohlcv", get(handlers::get_ohlcv::handler))
}
