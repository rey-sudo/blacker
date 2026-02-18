use std::collections::HashMap;
use tokio::sync::mpsc;
use crate::application::event::{ContextId, ControlEvent, InputEvent};

pub fn handle_control(
    control: ControlEvent,
    workers: &mut HashMap<ContextId, mpsc::Sender<InputEvent>>,
) {
    match control {
        // Worker terminated normally or finished processing.
        // Remove it from the active worker registry.
        ControlEvent::WorkerFinished(context_id) => {
            workers.remove(&context_id);
        }

        // Delete operation confirmed by worker.
        // Ensure the worker is removed from the registry.
        ControlEvent::DeleteConfirmed(context_id) => {
            workers.remove(&context_id);
        }
    }
}
