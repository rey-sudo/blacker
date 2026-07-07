use crate::{
    handlers::{get_state_handler, report_state_handler},
    state::AppState,
};
use axum::{
    Router,
    routing::{get, post},
};

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/master/report-state", post(report_state_handler))
        .route("/master/get-state", get(get_state_handler))
    //.route("/master/start-backtest", post(report_state_handler))
}
