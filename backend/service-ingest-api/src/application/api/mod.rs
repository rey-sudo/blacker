pub mod ohlcv;

use axum::Router;

use crate::application::state::AppState;

pub fn router() -> Router<AppState> {
    Router::new().nest("/ohlcv", ohlcv::router())
}
