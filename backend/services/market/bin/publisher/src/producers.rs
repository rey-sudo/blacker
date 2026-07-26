use anyhow::Result;
use pulsar::{Producer, Pulsar, TokioExecutor};
use std::collections::HashMap;

pub async fn create_producers(
    pulsar: &Pulsar<TokioExecutor>,
    source: &str,
    symbols: &str,
) -> Result<HashMap<String, Producer<TokioExecutor>>> {
    let mut producers: HashMap<String, Producer<TokioExecutor>> = HashMap::new();

    for symbol in symbols.split(',').map(str::trim) {
        let topic: String = format!("persistent://public/default/ticks/{}/{}", source, symbol);

        let producer: Producer<TokioExecutor> = pulsar.producer().with_topic(topic).build().await?;

        producers.insert(symbol.to_string(), producer);
    }

    Ok(producers)
}
