use crate::{protocol::{Hello, Role}, websocket::SharedState};
use axum::extract::ws::{Message};
use tokio::sync::mpsc;


pub async fn register_client(
    hello: Hello,
    sender: mpsc::Sender<Message>,
    state: SharedState,
) -> anyhow::Result<String> {
    let mut state = state.write().await;

    match hello.role {
        Role::Admin => {
            println!("Admin conectado");

            state.admin = Some(sender);

            Ok("admin".to_string())
        }

        Role::Slave => {
            let id: String = hello
                .id
                .ok_or_else(|| anyhow::anyhow!("Slave debe enviar id"))?;

            println!("Slave conectado: {id}");

            state.slaves.insert(id.clone(), sender);

            Ok(id)
        }
    }
}


