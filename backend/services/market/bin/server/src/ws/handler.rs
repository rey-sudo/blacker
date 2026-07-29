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
use pulsar::{Consumer, ConsumerOptions, SubType, TokioExecutor, consumer::InitialPosition};
use serde::Deserialize;
use tracing::{error, info};

//----------------------------------------------------------------------------------------------------------------------
// WEB SOCKET IMPLEMENTATION
//----------------------------------------------------------------------------------------------------------------------

#[derive(Debug, Deserialize)]
struct WsCommand {
    action: String,
    source: String,
    symbol: String,
}

pub async fn ws_handler(ws: WebSocketUpgrade, State(state): State<AppState>) -> Response {
    ws.on_upgrade(move |socket: WebSocket| handle_socket(socket, state))
}

//----------------------------------------------------------------------------------------------------------------------
// WEB SOCKET HANDLER
//----------------------------------------------------------------------------------------------------------------------

async fn handle_socket(mut socket: WebSocket, state: AppState) {
    info!("WS connected");

    let mut consumer: Option<Consumer<Vec<u8>, TokioExecutor>> = None;

    let mut current_engine: Option<String> = None;

    loop {
        tokio::select! {
                // Wait for the next message received from the WebSocket client.
                ws_msg = socket.recv() => {

                    // Continue only if the message is a valid text frame.
                    // Exit the loop if the connection is closed or another frame type is received.
                    let Some(Ok(Message::Text(text))) = ws_msg else {
                        break;
                    };

                    // Attempt to deserialize the incoming JSON payload into a WebSocket command.
                    // Ignore malformed or unsupported messages.
                    let Ok(cmd) = serde_json::from_str::<WsCommand>(&text) else {
                        continue;
                    };

                    let engine_id = format!("{}-{}",cmd.source,cmd.symbol);

                    // Handle a subscription request from the client.
                    if cmd.action == "subscribe" {
                        if current_engine.as_deref() == Some(&engine_id) {
                            info!("YA");
                            continue;
                        }
                        // Create a new Pulsar consumer subscribed to the latest events.
                        match state
                            .pulsar
                            .consumer()
                            .with_topic(
                                format!("persistent://public/default/live-{}", engine_id)
                            )
                            .with_subscription_type(SubType::Exclusive)
                            .with_subscription(
                                format!("ui-{}", uuid::Uuid::now_v7())
                            )
                            .with_options(ConsumerOptions {
                                initial_position: InitialPosition::Latest,
                                ..Default::default()
                            })
                            .build()
                            .await
                        {
                            Ok(c) => {
                                consumer = Some(c);
                                current_engine = Some(engine_id.clone());
                                info!("Subscribed {}", engine_id);
                            }

                            Err(e) => {
                                error!("Error creating the consumer: {:?}", e);

                                let _ = socket
                                    .send(Message::Text(
                                        serde_json::json!({
                                            "type": "error",
                                            "message": "The subscription could not be created."
                                        })
                                        .to_string()
                                        .into(),
                                    ))
                                    .await;

                                consumer = None;
                            }
                        }
                    }

                    // Handle cancel subscription request from the client.
                    if cmd.action == "unsubscribe" {
                        consumer = None;
                    }
                 }


                // Wait for the next message from the active Pulsar consumer.
                // If no consumer is active, wait indefinitely until one is created.
                pulsar_msg = async {
                    match consumer.as_mut() {
                        // Read the next available message from Pulsar.
                        Some(c) => c.next().await,

                        // Suspend this branch while there is no active consumer.
                        None => futures::future::pending().await,
                    }
                } =>  match pulsar_msg {

                    Some(Ok(mut msg)) => {
                        // Take ownership of the message payload without cloning it.
                        let data = std::mem::take(
                            &mut msg.payload.data
                        );

                        // Forward the payload to the WebSocket client as a binary frame.
                        // Close the loop if the client connection is no longer available.
                        if socket
                            .send(Message::Binary(data.into()))
                            .await
                            .is_err()
                        {
                            break;
                        }

                        // Acknowledge successful message processing to Pulsar.
                        if let Some(c) = consumer.as_mut() {
                            c.ack(&msg).await.ok();
                        }
                    }


                    Some(Err(e)) => {
                         info!("Pulsar error: {:?}", e);
                         consumer = None;
                    }


                    None => {
                         consumer = None;
                    }
                 }

        }
    }

    info!("WS closed");
}
