---
outline: deep
---

# service-feed

Microservice for **real-time routing and streaming** of financial chart data.  
It does not calculate, store, or replicate data: **it only routes and transmits**.

## What it does

- Manages user WebSocket connections
- Supports multiple charts per user
- Generates a unique `context_id` per chart
- Fetches and sends initial OHLCV history via HTTP
- Consumes live and closed OHLCV from Pulsar
- Efficiently broadcasts by symbol and timeframe
- Routes indicator output by `context_id`
- Handles per-user backpressure
- Scales horizontally without coordination

## What it does NOT do

- Does not calculate indicators
- Does not store historical data
- Does not replay events
- Does not contain business logic
- Does not maintain persistent state

## High-level Architecture

```
                 ┌────────────────────┐
                 │ service-ingest-api │
                 │  (HTTP history)    │
                 └─────────┬──────────┘
                           │
                           ▼
Frontend ──WS──▶ service-feed ──consume──▶ Apache Pulsar
                           ▲                    │
                           └────publish────────┘
                                (activations)
```

---

## Main Flow

1. User opens a chart via WebSocket
2. `service-feed` generates a `context_id`
3. OHLCV history is requested via HTTP
4. History is sent to the frontend
5. Live/closed OHLCV subscriptions are registered
6. Real-time updates are routed
7. Indicator outputs are consumed from Pulsar
8. Each message is delivered only to its target WebSocket

---

## Apache Pulsar Topics

### OHLCV

```
ohlcv-{timeframe}-live
ohlcv-{timeframe}-closed
```

- Persistent topics
- Subscription type: `Shared`
- No historical replay
- Incremental updates only

---

### Indicators

```
indicator-activation
indicator-output
```

**indicator-activation**
- Subscription type: `KeyShared`
- Partition key: `context_id`
- Triggers indicator workers

**indicator-output**
- Partitioned topic
- Subscription type: `KeyShared`
- Partition key: `context_id`
- Strong ordering per chart

---

## Data Model (high level)

### OHLCV

```json
{
  "symbol": "BTCUSDT",
  "timeframe": "1m",
  "open": 42000,
  "high": 42100,
  "low": 41950,
  "close": 42050,
  "volume": 123.4,
  "is_live": true,
  "is_closed": false,
  "sequence": 123456
}
```

---

### Indicator Output

```json
{
  "context_id": "uuid",
  "indicator": "EMA",
  "value": 42012.3,
  "is_live": true,
  "is_closed": false,
  "sequence": 123456
}
```

---

## WebSocket API

### Incoming commands (examples)

```json
{ "type": "open_chart", "symbol": "BTCUSDT", "timeframe": "1m" }
{ "type": "change_timeframe", "timeframe": "5m" }
{ "type": "add_indicator", "indicator": "EMA", "period": 21 }
```

---

### Outgoing messages

- OHLCV history
- Live / closed OHLCV updates
- Indicator output

All messages include:

- `is_live`
- `is_closed`
- `sequence` or timestamp

---

## Backpressure Handling

- Each WebSocket has its own bounded buffer
- Non-blocking `try_send` is used
- Live OHLCV updates may be dropped
- Closed indicator values are never dropped
- Slow WebSockets may be closed

A slow user **never impacts other users**.

---

## Horizontal Scaling

- No shared state between instances
- Pulsar handles fan-in
- Each instance performs local fan-out
- Deterministic routing by `context_id`
- No inter-node coordination

---

## Rust Implementation

- Tokio async runtime
- `DashMap` for shared in-memory state
- `Arc<T>` for zero-copy payload sharing
- One `mpsc::channel` per WebSocket
- Always-on Pulsar consumers

Mental model:

> If it crosses tasks → `Arc`  
> If it is per-user → `Sender`  
> If it is global → `DashMap`

---

## Running the Service

```bash
cargo run
```

Expected environment variables:

- `PULSAR_URL`
- `INGEST_HTTP_URL`
- `WS_BIND_ADDR`

---

## Design Principles

- Parsing happens exactly once
- No payload copying
- O(1) routing lookups
- Failures are isolated per user
- Predictable behavior under load

---

## Next Steps

- Pulsar schemas (Avro / Protobuf)
- Metrics and observability
- Load testing
- Chaos testing
- WebSocket authentication