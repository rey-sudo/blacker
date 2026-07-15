use crate::{
    handlers::{get_state_handler, report_state_handler, start_backtest_handler},
    master::state::AppState,
    ws::websocket_handler,
};
use axum::{
    Router,
    routing::{get, post},
};

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/master/report-state", post(report_state_handler))
        .route("/master/get-state", get(get_state_handler))
        .route("/master/start-backtest", post(start_backtest_handler))
        .route("/master/ws", get(websocket_handler))
}
