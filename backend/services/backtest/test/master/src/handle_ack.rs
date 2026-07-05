use crate::protocol::Ack;
use crate::websocket::SharedState;
use axum::extract::ws::Message;
use serde_json::json;

pub async fn handle_ack(
    ack: Ack,
    slave_id: Option<String>,
    state: SharedState,
) -> anyhow::Result<()> {
    let mut state = state.write().await;

    // 1. Buscar comando pendiente
    let Some(mut pending) = state.pending.remove(&ack.id) else {
        // ACK de algo inexistente o ya resuelto
        return Ok(());
    };

    let slave_id: String = match slave_id {
        Some(id) => id,
        None => return Ok(()), // ACK inválido
    };

    // 2. Marcar este slave como respondido
    pending.received.insert(slave_id);

    // 3. Si NO han respondido todos → guardar de nuevo y salir
    if pending.received.len() < pending.targets.len() {
        state.pending.insert(ack.id.clone(), pending);
        return Ok(());
    }

    // 4. TODOS respondieron → enviar resultado al admin
    if let Some(admin) = &state.admin {
        let response: serde_json::Value = json!({
            "type": "command_result",
            "id": ack.id,
            "status": "completed",
            "received_by": pending.received
        });

        let msg: Message = Message::Text(response.to_string().into());

        let _ = admin.send(msg).await;
    }

    Ok(())
}
