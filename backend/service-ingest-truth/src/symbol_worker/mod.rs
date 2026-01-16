use crate::common::tick::Tick;


/// Commands that can be sent to a symbol worker.
/// This defines the internal control protocol
/// for per-symbol processing.
pub enum SymbolCommand {
    /// Market tick for the symbol
    Tick(Tick),

    /// Graceful shutdown signal
    Shutdown,
}
