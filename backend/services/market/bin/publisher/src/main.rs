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

use ::publisher::{config::Config, producers::create_producers};
use anyhow::Result;
use clickhouse::Client;
use publisher::publisher;
use pulsar::{Producer, Pulsar, TokioExecutor};
use std::collections::HashMap;

#[tokio::main]
async fn main() -> Result<()> {
    tracing_subscriber::fmt::init();

    let config: Config = Config::from_env()?;

    let db: Client = Client::default()
        .with_url("http://localhost:8123")
        .with_database("app")
        .with_user("app")
        .with_password("app123");

    db.query("SELECT 1").execute().await?;

    let pulsar: Pulsar<TokioExecutor> = Pulsar::builder("pulsar://localhost:6650", TokioExecutor)
        .build()
        .await
        .expect("Invalid Pulsar URL");

    let mut producers: HashMap<String, Producer<TokioExecutor>> =
        create_producers(&pulsar, &config.source, &config.symbols).await?;

    publisher::run(db, producers, config).await?;

    Ok(())
}
