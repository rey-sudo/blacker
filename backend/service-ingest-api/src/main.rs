/*
 * BLACKER
 * Copyright (C) 2026  Juan José Caballero Rey
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

use std::sync::Arc;

use anyhow::Result;
use axum::{
    Json, Router,
    extract::State,
    http::StatusCode,
    routing::{get, post},
};
use serde::{Deserialize, Serialize};

use service_ingest_api::{config::Config, infrastructure::bootstrap};
use tracing::info;

#[tokio::main]
async fn main() -> Result<()> {
    bootstrap::run()?;

    let config: Arc<Config> = Arc::new(Config::from_env()?);

    let app: Router = Router::new()
        .route("/", get(root))
        .route("/users", post(create_user))
        .with_state(config);

    let listener: tokio::net::TcpListener =
        tokio::net::TcpListener::bind("0.0.0.0:3000").await.unwrap();

    println!("Servidor corriendo en http://localhost:3000");

    axum::serve(listener, app).await.unwrap();

    Ok(())
}

async fn root(State(_config): State<Arc<Config>>) -> &'static str {

    "Hello, World!"
}

// POST /users
async fn create_user(Json(payload): Json<CreateUser>) -> (StatusCode, Json<User>) {
    let user: User = User {
        id: 1337,
        username: payload.username,
    };

    (StatusCode::CREATED, Json(user))
}

// --------- Structs ---------

#[derive(Deserialize)]
struct CreateUser {
    username: String,
}

#[derive(Serialize)]
struct User {
    id: u64,
    username: String,
}
