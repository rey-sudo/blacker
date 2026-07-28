// BLACKER
// Copyright (C) 2026 Juan José Caballero Rey
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation version 3 of the License.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program. If not, see <https://www.gnu.org/licenses/>.

use crate::state::AppState;
use axum::{
    extract::{
        State,
        ws::{Message, WebSocket, WebSocketUpgrade},
    },
    response::Response,
};
use futures::StreamExt;
use pulsar::{Consumer, SubType, TokioExecutor};
use serde::Deserialize;

//----------------------------------------------------------------------------------------------------------------------
// WEB SOCKET IMPLEMENTATION
//----------------------------------------------------------------------------------------------------------------------

#[derive(Debug, Deserialize)]
struct WsCommand {
    action: String,
    engine_id: String,
}

pub async fn ws_handler(ws: WebSocketUpgrade, State(state): State<AppState>) -> Response {
    ws.on_upgrade(move |socket: WebSocket| handle_socket(socket, state))
}

//----------------------------------------------------------------------------------------------------------------------
// WEB SOCKET HANDLER
//----------------------------------------------------------------------------------------------------------------------

async fn handle_socket(mut socket: WebSocket, state: AppState) {
    println!("WS conectado");

    let mut consumer: Option<Consumer<Vec<u8>, TokioExecutor>> = None;

    loop {
        tokio::select! {

                 ws_msg = socket.recv() => {

                     let Some(Ok(Message::Text(text))) = ws_msg else {
                         break;
                     };


                     let Ok(cmd) = serde_json::from_str::<WsCommand>(&text) else {
                         continue;
                     };


                     if cmd.action == "subscribe" {

                         let topic = format!(
                             "persistent://public/default/live-{}",
                             cmd.engine_id
                         );


                         consumer = Some(
                             state
                                 .pulsar
                                 .consumer()
                                 .with_topic(topic)
                                 .with_subscription_type(SubType::Exclusive)
                                 .with_subscription(
                                     format!("ui-{}", cmd.engine_id)
                                 )
                                 .build()
                                 .await
                                 .unwrap()
                         );

                         println!("suscrito {}", cmd.engine_id);
                     }


                     if cmd.action == "unsubscribe" {
                         consumer = None;
                     }
                 }



                pulsar_msg = async {
                    match consumer.as_mut() {
                        Some(c) => c.next().await,
                        None => futures::future::pending().await,
                    }
                } =>  match pulsar_msg {

                    Some(Ok(mut msg)) => {

                        let data = std::mem::take(
                            &mut msg.payload.data
                        );


                        if socket
                            .send(Message::Binary(data.into()))
                            .await
                            .is_err()
                        {
                            break;
                        }


                        if let Some(c) = consumer.as_mut() {
                            c.ack(&msg).await.ok();
                        }
                    }


                    Some(Err(e)) => {

                         println!(
                             "Pulsar error: {:?}",
                             e
                         );

                         consumer = None;
                    }


                    None => {
                         consumer = None;
                    }
                 }

        }
    }

    println!("WS cerrado");
}
