use crate::common::SlaveId;


#[derive(Debug, Default)]
pub struct Session {
    pub slave: Option<SlaveId>,
}