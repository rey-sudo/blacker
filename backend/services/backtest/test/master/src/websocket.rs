use crate::{
    app::{App, SlaveStatus},
    common::{Packet, SlaveId},
    session::Session,
};
use axum::{
    extract::{
        State,
        ws::{Message, WebSocket, WebSocketUpgrade},
    },
    response::IntoResponse,
};
use futures_util::StreamExt;
use std::sync::Arc;
use std::time::Instant;
use tokio::sync::RwLock;

pub type SharedApp = Arc<RwLock<App>>;

pub async fn ws_handler(State(app): State<SharedApp>, ws: WebSocketUpgrade) -> impl IntoResponse {
    ws.on_upgrade(move |socket| handle_socket(app, socket))
}

async fn handle_socket(app: SharedApp, mut socket: WebSocket) {
    println!("Nueva conexión");
    let mut session: Session = Session::default();

    while let Some(Ok(msg)) = socket.next().await {
        match msg {
            Message::Text(text) => match serde_json::from_str::<Packet>(&text) {
                Ok(Packet::Hello { id }) => {
                    let mut app = app.write().await;

                    session.slave = Some(id);

                    match id {
                        SlaveId::Tick => {
                            app.tick.connected = true;
                            app.tick.status = SlaveStatus::Online;
                            app.tick.last_seen = Instant::now();

                            println!("TickSlave conectado");
                        }

                        SlaveId::Engine => {
                            app.engine.connected = true;
                            app.engine.status = SlaveStatus::Online;
                            app.engine.last_seen = Instant::now();

                            println!("EngineSlave conectado");
                        }
                    }

                    app.update_state();

                    println!("Estado master: {:?}", app.state);
                }

                Ok(packet) => {
                    println!("Packet recibido: {:?}", packet);
                }

                Err(err) => {
                    println!("Packet inválido: {}", err);
                }
            },

            Message::Close(_) => {
                println!("Socket cerrado");
                break;
            }

            _ => {}
        }
    }

    if let Some(slave) = session.slave {
        let mut app = app.write().await;

        match slave {
            SlaveId::Tick => {
                app.tick.connected = false;
                app.tick.status = SlaveStatus::Offline;

                println!("TickSlave desconectado");
            }

            SlaveId::Engine => {
                app.engine.connected = false;
                app.engine.status = SlaveStatus::Offline;

                println!("EngineSlave desconectado");
            }
        }

        app.update_state();

        println!("Estado master: {:?}", app.state);
    }

    println!("Conexión finalizada");
}
