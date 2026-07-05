use crate::protocol::PendingCommand;
use crate::protocol::{Command, Target};
use crate::websocket::SharedState;
use axum::extract::ws::Message;
use serde_json::json;
use std::collections::HashSet;

pub async fn handle_command(cmd: Command, state: SharedState) -> anyhow::Result<()> {
    let mut state = state.write().await;

    match cmd.target {
        Target::Slave(slave_id) => {
            // UNICAST
            if let Some(slave) = state.slaves.get(&slave_id) {
                let payload: serde_json::Value = json!({
                    "type": "command",
                    "id": cmd.id,
                    "command": cmd.command
                });

                let msg: Message = Message::Text(payload.to_string().into());

                slave.send(msg).await?;

                // track pending ACK
                state.pending.insert(
                    cmd.id.clone(),
                    PendingCommand {
                        targets: vec![slave_id.clone()].into_iter().collect(),
                        received: HashSet::new(),
                    },
                );
            }
        }

        Target::Broadcast => {
            // BROADCAST
            let mut targets: HashSet<String> = HashSet::new();

            for (id, slave) in &state.slaves {
                targets.insert(id.clone());

                let payload: String = serde_json::to_string(&json!({
                    "type": "command",
                    "id": cmd.id,
                    "command": cmd.command
                }))?;

                let msg: Message = Message::Text(payload.into());

                slave.send(msg).await?;
            }

            state.pending.insert(
                cmd.id.clone(),
                PendingCommand {
                    targets,
                    received: HashSet::new(),
                },
            );
        }
    }

    Ok(())
}
