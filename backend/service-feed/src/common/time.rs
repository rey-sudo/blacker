use chrono::Utc;


pub fn current_unix() -> i64 {
    Utc::now().timestamp()
}