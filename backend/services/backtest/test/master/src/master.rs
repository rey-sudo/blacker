#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum MasterState {
    Starting,
    WaitingForSlaves,
    Ready,
    Running,
    Error,
}