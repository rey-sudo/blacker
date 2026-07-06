use crate::{
    state::AppState,
};
use axum::{Router, routing::{get, post}};

pub fn router() -> Router<AppState> {
    Router::new()
       // .route("/report-state", post(report_state_handler))
      //  .route("/get-state", get(get_state_handler))
}
