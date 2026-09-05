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

use crate::models::Symbol;
use anyhow::Result;
use pulsar::{Producer, Pulsar, TokioExecutor};
use std::collections::HashMap;

/// Creates and returns a Pulsar producer for each symbol.
///
/// Each symbol is mapped to a producer targeting the corresponding
/// `ticks-{source}-{symbol}` topic.
///
/// # Arguments
/// * `pulsar` - Shared Pulsar client instance.
/// * `source` - Market data source identifier used to build the topic name.
/// * `symbols` - Comma-separated list of symbols.
///
/// # Returns
/// A map where each symbol is associated with its configured producer.
pub async fn create_producers(
    pulsar: &Pulsar<TokioExecutor>,
    source: &str,
    symbols: &str,
) -> Result<HashMap<Symbol, Producer<TokioExecutor>>> {
    let mut producers: HashMap<Symbol, Producer<TokioExecutor>> = HashMap::new();

    for symbol in symbols.split(',').map(str::trim) {
        let topic: String = format!("persistent://public/default/ticks-{}-{}", source, symbol);

        let producer: Producer<TokioExecutor> = pulsar.producer().with_topic(topic).build().await?;

        producers.insert(symbol.to_string(), producer);
    }

    Ok(producers)
}
