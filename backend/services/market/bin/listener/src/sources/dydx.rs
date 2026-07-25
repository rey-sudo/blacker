pub fn get_source_endpoint(source: &str) -> &'static str {
    match source {
        "dydx" => "wss://indexer.dydx.trade/v4/ws",
        _ => panic!("Source not found: {}", source),
    }
}