use crate::application::state::{AppState, Chart, WsSender};
use crate::application::types::{
    CandlePage, ContextId, IndicatorKind, IndicatorParams, IndicatorSpec, Symbol,
};
use crate::common::candle::Timeframe;
use crate::common::time::current_unix;
use crate::config::Config;
use futures_util::{SinkExt, StreamExt};
use serde_json::json;
use std::str::FromStr;
use std::sync::Arc;
use tokio::net::TcpListener;
use tokio::sync::mpsc;
use tokio_tungstenite::accept_async;
use tokio_tungstenite::tungstenite::Message;
use tracing::info;
use uuid::Uuid;

#[derive(serde::Deserialize)]
pub struct WsCommand {
    pub action: String,

    pub context_id: Option<ContextId>,

    pub symbol: Option<Symbol>,
    pub timeframe: Option<String>,

    // indicador
    pub indicator_id: Option<Uuid>,
    pub indicator: Option<IndicatorKind>,
    pub params: Option<IndicatorParams>,
}

pub fn cleanup_ws(tx: WsSender, state: &AppState) {
    // 1. Encontrar todos los context_id cuyo chart pertenece a este WS
    let context_ids: Vec<_> = state
        .charts
        .iter()
        .filter(|entry| entry.value().ws_sender.same_channel(&tx))
        .map(|entry| entry.key().clone())
        .collect();

    // 2. Eliminar charts y limpiar índices
    for context_id in context_ids {
        if let Some((_, chart)) = state.charts.remove(&context_id) {
            let key = (chart.symbol.clone(), chart.timeframe.clone());

            if let Some(mut entry) = state.ohlcv_index.get_mut(&key) {
                entry.retain(|cid| cid != &context_id);

                // limpieza extra: si no quedan charts, borra la key
                if entry.is_empty() {
                    drop(entry);
                    state.ohlcv_index.remove(&key);
                }
            }

            // TODO (opcional):
            // emitir indicator-deactivation por cada indicator del chart
        }
    }
}

pub async fn start_ws_server(config: Arc<Config>, state: Arc<AppState>) {
    let listener: TcpListener = TcpListener::bind("0.0.0.0:3030").await.unwrap();
    info!("WebSocket server listening on 0.0.0.0:3030");

    while let Ok((stream, addr)) = listener.accept().await {
        let c: Arc<Config> = config.clone();
        let s: Arc<AppState> = state.clone();
        tokio::spawn(async move {
            match accept_async(stream).await {
                Ok(ws_stream) => {
                    info!("New WS connection from {}", addr);
                    handle_ws_connection(ws_stream, s).await;
                }
                Err(e) => {
                    tracing::error!("Error during WS handshake: {:?}", e);
                }
            }
        });
    }
}

async fn handle_ws_connection(
    ws_stream: tokio_tungstenite::WebSocketStream<tokio::net::TcpStream>,
    state: Arc<AppState>,
) {
    let (mut ws_sender, mut ws_receiver) = ws_stream.split();
    let (tx, mut rx) = mpsc::channel::<Arc<serde_json::Value>>(100);

    // Task único dueño del WebSocket writer
    tokio::spawn(async move {
        while let Some(msg) = rx.recv().await {
            if let Ok(text) = serde_json::to_string(&*msg) {
                if ws_sender.send(Message::Text(text.into())).await.is_err() {
                    break;
                }
            }
        }
    });

    // Loop de lectura (comandos desde el cliente)
    while let Some(Ok(msg)) = ws_receiver.next().await {
        match msg {
            Message::Text(text) => match serde_json::from_str::<WsCommand>(&text) {
                Ok(cmd) => {
                    handle_ws_command(cmd, tx.clone(), state.clone()).await;
                }
                Err(e) => {
                    tracing::warn!("invalid ws command: {}", e);
                }
            },

            Message::Close(_) => {
                tracing::info!("ws closed by client");
                break;
            }

            Message::Ping(p) => {
                // tungstenite maneja pong automático si quieres
                tracing::debug!("ping {:?}", p);
            }

            _ => {}
        }
    }

    cleanup_ws(tx, &state);
}

pub async fn handle_ws_command(cmd: WsCommand, tx: WsSender, state: Arc<AppState>) {
    match cmd.action.as_str() {
        "open_chart" => {
            let symbol: Symbol = match cmd.symbol {
                Some(s) => s,
                None => {
                    tracing::warn!("ws command missing symbol");
                    return;
                }
            };

            let timeframe: Timeframe = match cmd.timeframe {
                Some(t) => match Timeframe::from_str(&t) {
                    Ok(tf) => tf,
                    Err(_) => {
                        tracing::warn!(timeframe = %t, "invalid timeframe in ws command");
                        return;
                    }
                },
                None => {
                    tracing::warn!("ws command missing timeframe");
                    return;
                }
            };

            let context_id: ContextId = ContextId::new(); //implement no duplication

            let mut chart: Chart = Chart {
                context_id: context_id.clone(),
                symbol: symbol.clone(),
                timeframe,
                ws_sender: tx.clone(),
                indicators: Vec::new(),

                cursor: 0,
                from: 0,
                to: 0,

                length: 500,
            };

            let limit: i64 = chart.length as i64;

            let http: reqwest::Client = reqwest::Client::new();
            let ingest_url: &str = "http://localhost:3001/api/ingest/ohlcv/get-ohlcv";

            let response: CandlePage = match http
                .get(ingest_url)
                .query(&[
                    ("symbol", symbol.to_string().as_str()),
                    ("timeframe", chart.timeframe.to_string().as_str()),
                    ("limit", &limit.to_string()),
                ])
                .send()
                .await
            {
                Ok(resp) => match resp.json::<CandlePage>().await {
                    Ok(data) => data,
                    Err(e) => {
                        tracing::error!(error = ?e, "failed to deserialize ohlcv response");
                        return;
                    }
                },
                Err(e) => {
                    tracing::error!(error = ?e, "failed to fetch ohlcv snapshot");
                    return;
                }
            };

            chart.cursor = response.cursor;
            chart.from = response.cursor;
            chart.to = response.first;

            state.charts.insert(context_id.clone(), chart);

            state
                .ohlcv_index
                .entry((symbol, timeframe))
                .or_default()
                .push(context_id.clone());

            let _ = tx
                .send(Arc::new(json!({
                    "type": "ohlcv_snapshot",
                    "context_id": context_id,
                    "data": response.data,
                    "first": response.first,
                    "cursor": response.cursor,
                })))
                .await;

            let _ = tx
                .send(Arc::new(json!({
                    "type": "chart_opened",
                    "context_id": context_id,
                })))
                .await;
        }

        // ─────────────────────────────────────────────
        // CLOSE CHART
        // ─────────────────────────────────────────────
        "close_chart" => {
            let context_id = match cmd.context_id {
                Some(id) => id,
                None => return,
            };

            if let Some((_, chart)) = state.charts.remove(&context_id) {
                let key = (chart.symbol.clone(), chart.timeframe.clone());

                if let Some(mut entry) = state.ohlcv_index.get_mut(&key) {
                    entry.retain(|cid| cid != &context_id);
                }
            }
        }

        // ─────────────────────────────────────────────
        // ADD INDICATOR
        // ─────────────────────────────────────────────
        "add_indicator" => {
            let context_id = match cmd.context_id {
                Some(id) => id,
                None => return,
            };

            let kind = match cmd.indicator {
                Some(i) => i,
                None => return,
            };

            let params = cmd.params.unwrap_or_default();

            let indicator = IndicatorSpec {
                indicator_id: Uuid::now_v7(),
                kind,
                params,
            };

            if let Some(mut chart) = state.charts.get_mut(&context_id) {
                chart.indicators.push(indicator.clone());
            }

            // TODO: publicar indicator-activation en Pulsar
            // payload:
            // { context_id, indicator_id, indicator, params }

            let msg = json!({
                "type": "indicator_added",
                "context_id": context_id,
                "indicator_id": indicator.indicator_id,
            });

            let _ = tx.send(Arc::new(msg)).await;
        }

        // ─────────────────────────────────────────────
        // REMOVE INDICATOR
        // ─────────────────────────────────────────────
        "remove_indicator" => {
            let context_id = match cmd.context_id {
                Some(id) => id,
                None => return,
            };

            let indicator_id = match cmd.indicator_id {
                Some(id) => id,
                None => return,
            };

            if let Some(mut chart) = state.charts.get_mut(&context_id) {
                chart.indicators.retain(|i| i.indicator_id != indicator_id);
            }

            // TODO: publicar indicator-deactivation si aplica
        }

        _ => {
            tracing::warn!("Unknown WS action: {}", cmd.action);
        }
    }
}
