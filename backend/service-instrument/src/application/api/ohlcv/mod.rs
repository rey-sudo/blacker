pub mod get_ohlcv;

use axum::{Router, routing::get};
use crate::application::state::AppState;

pub fn router() -> Router<AppState> {
    Router::new().route("/get-ohlcv", get(get_ohlcv::handler))
}
