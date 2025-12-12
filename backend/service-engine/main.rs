// src/main.rs
use chrono::{DateTime, Utc};
use rand::Rng;
use sqlx::{PgPool, FromRow};
use std::{error::Error, time::Duration};
use tokio::time::sleep;

const MAX_SLIPPAGE: f64 = 0.0001; // ajustar según el activo
const BATCH_SIZE: i64 = 500;
const SLEEP_MS: u64 = 100;

// -------------------------
// Modelos
// -------------------------
#[derive(Debug, FromRow)]
struct Order {
    order_id: i64,
    instrument: String,
    order_type: String, // "BUY" o "SELL"
    entry_price: f64,
    size: f64,
    stop_loss: Option<f64>,
    take_profit: Option<f64>,
    start_timestamp: DateTime<Utc>,
    end_timestamp: DateTime<Utc>,
    // Nota: la tabla orders debe tener columnas adicionales: status, pnl, close_reason, closed_at
}

#[derive(Debug)]
struct Tick {
    timestamp: DateTime<Utc>,
    bid: f64,
    ask: f64,
    last: f64,
    volume: Option<f64>,
}

// -------------------------
// Lógica de PnL y ejecución
// -------------------------
fn calculate_pnl_with_slippage(order: &Order, ticks: &[Tick]) -> (f64, String) {
    // Devuelve (pnl, close_reason) donde close_reason = "tp", "sl" o "expired"
    let mut pnl = 0.0;
    let mut rng = rand::thread_rng();

    if ticks.is_empty() {
        return (0.0, "expired".to_string());
    }

    for (i, tick) in ticks.iter().enumerate() {
        // PnL flotante usando precio ejecutable: ask para BUY, bid para SELL
        pnl = match order.order_type.as_str() {
            "BUY" => (tick.ask - order.entry_price) * order.size,
            "SELL" => (order.entry_price - tick.bid) * order.size,
            _ => 0.0,
        };

        // STOP LOSS
        if let Some(sl) = order.stop_loss {
            let sl_hit = (order.order_type == "BUY" && tick.bid <= sl)
                         || (order.order_type == "SELL" && tick.ask >= sl);
            if sl_hit {
                let slippage_amt = rng.gen_range(0.0..MAX_SLIPPAGE);
                let exec_price = if order.order_type == "BUY" {
                    // BUY: execution uses ask + slippage (worse price for buyer)
                    tick.ask + slippage_amt
                } else {
                    // SELL: execution uses bid - slippage (worse price for seller)
                    tick.bid - slippage_amt
                };

                pnl = if order.order_type == "BUY" {
                    (exec_price - order.entry_price) * order.size
                } else {
                    (order.entry_price - exec_price) * order.size
                };

                return (pnl, "sl".to_string());
            }
        }

        // TAKE PROFIT
        if let Some(tp) = order.take_profit {
            let tp_hit = (order.order_type == "BUY" && tick.ask >= tp)
                         || (order.order_type == "SELL" && tick.bid <= tp);
            if tp_hit {
                let slippage_amt = rng.gen_range(0.0..MAX_SLIPPAGE);
                let exec_price = if order.order_type == "BUY" {
                    tick.ask + slippage_amt
                } else {
                    tick.bid - slippage_amt
                };

                pnl = if order.order_type == "BUY" {
                    (exec_price - order.entry_price) * order.size
                } else {
                    (order.entry_price - exec_price) * order.size
                };

                return (pnl, "tp".to_string());
            }
        }

        // Si llegamos al final de ticks sin TP/SL
        if i == ticks.len() - 1 {
            let slippage_amt = rng.gen_range(0.0..MAX_SLIPPAGE);
            let exec_price = if order.order_type == "BUY" {
                tick.ask + slippage_amt
            } else {
                tick.bid - slippage_amt
            };

            pnl = if order.order_type == "BUY" {
                (exec_price - order.entry_price) * order.size
            } else {
                (order.entry_price - exec_price) * order.size
            };

            return (pnl, "expired".to_string());
        }
    }

    (pnl, "expired".to_string())
}

// -------------------------
// DB / procesamiento por orden
// -------------------------
async fn process_single_order(order: &Order, db_pool: &PgPool) -> Result<(), Box<dyn Error>> {
    // Iniciamos transacción para actualizar estado atómicamente al final
    let mut tx = db_pool.begin().await?;

    // Validaciones básicas
    if order.entry_price <= 0.0 || order.size <= 0.0 {
        sqlx::query!("UPDATE orders SET status='error', close_reason='invalid' WHERE order_id=$1", order.order_id)
            .execute(&mut tx)
            .await?;
        tx.commit().await?;
        return Err("Invalid order parameters".into());
    }

    // Validar timestamps
    if order.start_timestamp > order.end_timestamp {
        sqlx::query!("UPDATE orders SET status='error', close_reason='invalid_timestamp' WHERE order_id=$1", order.order_id)
            .execute(&mut tx)
            .await?;
        tx.commit().await?;
        return Err("start_timestamp > end_timestamp".into());
    }

    // Obtener ticks del microservicio (ya filtrados por start/end)
    let ticks = fetch_ticks(&order.instrument, order.start_timestamp, order.end_timestamp).await?;

    // Calcular PnL y razón de cierre
    let (pnl, reason) = calculate_pnl_with_slippage(order, &ticks);

    // Actualizamos orden con pnl, estado y razón de cierre
    sqlx::query!(
        r#"
        UPDATE orders
        SET pnl = $1, status = 'done', close_reason = $2, closed_at = now()
        WHERE order_id = $3
        "#,
        pnl,
        reason,
        order.order_id
    )
    .execute(&mut tx)
    .await?;

    tx.commit().await?;
    Ok(())
}

// -------------------------
// Batch safe: reservamos órdenes y las marcamos 'processing' antes de ejecutar
// -------------------------
async fn reserve_batch(db_pool: &PgPool, batch_size: i64) -> Result<Vec<i64>, Box<dyn Error>> {
    let mut tx = db_pool.begin().await?;

    let rows = sqlx::query!(
        r#"
        SELECT order_id
        FROM orders
        WHERE status = 'pending'
        ORDER BY start_timestamp
        LIMIT $1
        FOR UPDATE SKIP LOCKED
        "#,
        batch_size
    )
    .fetch_all(&mut tx)
    .await?;

    let ids: Vec<i64> = rows.into_iter().map(|r| r.order_id).collect();

    if !ids.is_empty() {
        // Actualizamos status a 'processing' usando array param para mayor claridad
        sqlx::query!(
            r#"
            UPDATE orders
            SET status = 'processing'
            WHERE order_id = ANY($1)
            "#,
            &ids
        )
        .execute(&mut tx)
        .await?;
    }

    tx.commit().await?;
    Ok(ids)
}

async fn fetch_order_by_id(db_pool: &PgPool, id: i64) -> Result<Order, Box<dyn Error>> {
    let ord = sqlx::query_as!(
        Order,
        r#"
        SELECT order_id, instrument, order_type, entry_price, size,
               stop_loss, take_profit, start_timestamp, end_timestamp
        FROM orders
        WHERE order_id = $1
        "#,
        id
    )
    .fetch_one(db_pool)
    .await?;

    Ok(ord)
}

// -------------------------
// fetch_ticks: stub - reemplaza con llamada real a tu microservicio/DB
// -------------------------
async fn fetch_ticks(_instrument: &str, _start: DateTime<Utc>, _end: DateTime<Utc>) -> Result<Vec<Tick>, Box<dyn Error>> {
    // TODO: implementar consulta real a tu microservicio de ticks / timeseries DB (TimescaleDB / ClickHouse / etc.)
    // Ejemplo mínimo simulado:
    let ticks = vec![
        Tick { timestamp: _start, bid: 1.1005, ask: 1.1008, last: 1.1006, volume: Some(0.5) },
        Tick { timestamp: _start + chrono::Duration::milliseconds(300), bid: 1.1006, ask: 1.1009, last: 1.1007, volume: Some(1.2) },
        Tick { timestamp: _start + chrono::Duration::milliseconds(600), bid: 1.1007, ask: 1.1010, last: 1.1008, volume: Some(0.3) },
    ];
    Ok(ticks)
}

// -------------------------
// Loop principal
// -------------------------
async fn process_loop(db_pool: &PgPool) -> Result<(), Box<dyn Error>> {
    loop {
        let ids = reserve_batch(db_pool, BATCH_SIZE).await?;

        if ids.is_empty() {
            sleep(Duration::from_millis(SLEEP_MS)).await;
            continue;
        }

        for id in ids {
            match fetch_order_by_id(db_pool, id).await {
                Ok(order) => {
                    if let Err(e) = process_single_order(&order, db_pool).await {
                        eprintln!("Error procesando orden {}: {}", order.order_id, e);
                        let _ = sqlx::query!("UPDATE orders SET status='error', close_reason='processing_error' WHERE order_id=$1", order.order_id)
                            .execute(db_pool)
                            .await;
                    }
                }
                Err(e) => {
                    eprintln!("No se pudo leer orden id {}: {}", id, e);
                }
            }
        }

        sleep(Duration::from_millis(SLEEP_MS)).await;
    }
}

// -------------------------
// main
// -------------------------
#[tokio::main]
async fn main() -> Result<(), Box<dyn Error>> {
    // Reemplaza la cadena por tu conexión real (usa variables de entorno en producción)
    let db_pool = PgPool::connect("postgres://usuario:password@localhost:5432/dbname").await?;

    println!("Motor iniciando loop...");
    process_loop(&db_pool).await?;

    Ok(())
}
