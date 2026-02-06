/*
 * BLACKER
 * Copyright (C) 2025  Juan José Caballero Rey
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
use axum::Router;
use tracing::info;
use service_instrument::{
    application::{api, state::AppState},
    config::Config,
    infrastructure::{bootstrap, database::Database},
};


#[tokio::main]
async fn main() -> Result<()> {
    bootstrap::run()?;

    let config: Arc<Config> = Arc::new(Config::from_env()?);

    let db: Arc<Database> = Arc::new(Database::new(&config.database_url).await?);

    let state: AppState = AppState { config, db };

    let app: Router = Router::new().nest("/api/ingest", api::router()).with_state(state);

    let listener: tokio::net::TcpListener =
        tokio::net::TcpListener::bind("0.0.0.0:3001").await.unwrap();

    info!("Server listening http://localhost:3001");

    axum::serve(listener, app).await.unwrap();

    Ok(())
}
