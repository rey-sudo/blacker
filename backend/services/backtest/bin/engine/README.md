# Indicators Available from the Bar Aggregator

## 1. Overview

The `BarAggregator` produces time-bucketed bars with both conventional OHLCV data and detailed trade-flow information.

Each `Bar` contains:

- OHLC prices
- Total volume
- Aggressive buy volume
- Aggressive sell volume
- Trade count
- Minimum and maximum trade size
- VWAP accumulator
- Volume-at-price data
- Per-price buy/sell volume
- Per-price trade counts
- Per-price maximum trade sizes

This means the aggregator is not limited to conventional candle indicators. It provides the raw information required for **price, volume, order-flow, footprint, volatility, momentum, and market-profile style indicators**.

The exact number of indicators is not fixed. From these fields, a very large number of indicators can be built, including custom combinations and derived indicators.

---

# 2. Direct Bar Indicators

These can be calculated directly from a single `Bar`.

## 2.1 Price

### Open
`bar.open`

### High
`bar.high`

### Low
`bar.low`

### Close
`bar.close`

### Range

```text
range = high - low
```

### Body

```text
body = abs(close - open)
```

### Upper Wick

```text
upper_wick = high - max(open, close)
```

### Lower Wick

```text
lower_wick = min(open, close) - low
```

### Body-to-Range Ratio

```text
body_ratio = body / range
```

Useful for candle classification.

### Close Location Value

```text
CLV = ((close - low) - (high - close)) / (high - low)
```

This measures where the close occurred within the bar range.

---

# 3. Volume Indicators

The aggregator provides enough information to calculate conventional volume indicators.

## 3.1 Total Volume

```text
total_volume
```

## 3.2 Average Volume

Across a rolling window:

```text
average_volume = mean(volume)
```

## 3.3 Relative Volume

```text
relative_volume = current_volume / average_volume
```

## 3.4 Volume Moving Average

Examples:

- SMA of volume
- EMA of volume
- WMA of volume

## 3.5 Volume Rate of Change

```text
VROC = (volume / volume[n]) - 1
```

## 3.6 Volume Z-Score

```text
z = (volume - mean(volume)) / std(volume)
```

## 3.7 Cumulative Volume

```text
CV = Σ volume
```

---

# 4. VWAP Indicators

The aggregator explicitly stores:

```text
volume_price_sum = Σ(price × volume)
```

and:

```text
VWAP = volume_price_sum / total_volume
```

This supports several VWAP-based indicators.

## 4.1 Bar VWAP

Already available through:

```text
bar.vwap
```

## 4.2 Rolling VWAP

```text
rolling_vwap =
    Σ(price × volume) / Σ(volume)
```

over a configurable window.

## 4.3 Session VWAP

The same formula can be accumulated from the beginning of a trading session.

## 4.4 Anchored VWAP

VWAP can be reset at an arbitrary event:

- session open
- market open
- swing high
- swing low
- news event
- manually selected timestamp

## 4.5 VWAP Deviation

```text
deviation = price - VWAP
```

## 4.6 VWAP Percentage Deviation

```text
deviation_pct = (price - VWAP) / VWAP
```

## 4.7 VWAP Standard Deviation Bands

With sufficient historical data, weighted variance can be calculated and used to build:

- VWAP + 1σ
- VWAP - 1σ
- VWAP + 2σ
- VWAP - 2σ
- etc.

---

# 5. Delta and Order-Flow Indicators

The aggregator explicitly separates aggressive buying and selling.

```text
delta = ask_volume - bid_volume
```

This is one of the most important features of the data model.

## 5.1 Bar Delta

```text
delta = ask_volume - bid_volume
```

## 5.2 Delta Percentage

```text
delta_pct = delta / total_volume
```

## 5.3 Cumulative Delta

```text
cumulative_delta = Σ delta
```

## 5.4 Rolling Delta

```text
rolling_delta = Σ delta over N bars
```

## 5.5 Delta Moving Average

Examples:

- Delta SMA
- Delta EMA
- Delta WMA

## 5.6 Delta Rate of Change

```text
delta_roc = delta / delta[n] - 1
```

Care must be taken when the previous delta is zero or changes sign.

## 5.7 Delta Z-Score

```text
delta_z =
    (delta - mean(delta)) / std(delta)
```

## 5.8 Delta / Volume Ratio

```text
delta_volume_ratio = delta / total_volume
```

This normalizes delta across bars with different volume.

## 5.9 Buy Volume Percentage

```text
buy_pct = ask_volume / total_volume
```

## 5.10 Sell Volume Percentage

```text
sell_pct = bid_volume / total_volume
```

For positive volume:

```text
buy_pct + sell_pct = 1
```

---

# 6. Trade Count Indicators

Each bar stores the number of trades.

## 6.1 Trade Count

```text
trades
```

## 6.2 Average Trade Size

```text
average_trade_size = total_volume / trades
```

## 6.3 Trade Count Moving Average

Rolling SMA/EMA/WMA of trade count.

## 6.4 Trade Count Rate

Trade count relative to a historical average.

## 6.5 Volume per Trade

Equivalent to average trade size:

```text
volume_per_trade = total_volume / trades
```

## 6.6 Trade Intensity

Possible definitions include:

```text
trade_intensity =
    current_trades / average_trades
```

---

# 7. Trade Size Indicators

The aggregator stores:

```text
min_trade
max_trade
```

This allows several useful statistics.

## 7.1 Minimum Trade Size

```text
min_trade
```

## 7.2 Maximum Trade Size

```text
max_trade
```

## 7.3 Trade Size Range

```text
trade_size_range = max_trade - min_trade
```

## 7.4 Maximum Trade / Average Trade

```text
max_trade_ratio =
    max_trade / average_trade_size
```

This can be used to identify unusually large executions.

## 7.5 Large Trade Detection

A threshold can be defined relative to:

- rolling mean
- rolling standard deviation
- percentile
- median
- average trade size

Example:

```text
large_trade =
    trade_size > average_trade_size × K
```

---

# 8. Footprint / Volume-at-Price Indicators

This is where the aggregator becomes significantly more powerful than a conventional OHLCV aggregator.

Each bar contains:

```text
volume_at_price[price] -> PriceLevel
```

Each `PriceLevel` contains:

- price
- bid volume
- ask volume
- total volume
- trades
- minimum trade
- maximum trade
- buy trade count
- sell trade count
- maximum buy trade
- maximum sell trade
- delta

This supports footprint-style analytics.

---

# 9. Point of Control (POC)

The POC is the price with the largest traded volume inside the bar.

```text
POC =
    price where PriceLevel.total_volume is maximum
```

Possible variants:

- Volume POC
- Buy-volume POC
- Sell-volume POC
- Delta POC
- Trade-count POC

---

# 10. Volume Profile Indicators

From `volume_at_price`, a complete volume distribution can be reconstructed for every bar.

## 10.1 Volume Profile

```text
price -> total_volume
```

## 10.2 Buy Volume Profile

```text
price -> ask_volume
```

## 10.3 Sell Volume Profile

```text
price -> bid_volume
```

## 10.4 Delta Profile

```text
price -> ask_volume - bid_volume
```

## 10.5 Trade Count Profile

```text
price -> trades
```

---

# 11. Value Area Indicators

Given the volume distribution, the following can be calculated:

- Value Area High (VAH)
- Value Area Low (VAL)
- Point of Control (POC)
- Value Area Width
- Value Area Volume
- Volume outside Value Area
- Percentage of volume inside Value Area

A common definition uses approximately 70% of total volume, although the percentage can be configurable.

---

# 12. Volume-at-Price Delta Indicators

Each price level has its own delta.

## 12.1 Price-Level Delta

```text
level_delta =
    ask_volume - bid_volume
```

## 12.2 Maximum Positive Delta

```text
max_positive_delta =
    max(level.delta)
```

## 12.3 Maximum Negative Delta

```text
max_negative_delta =
    min(level.delta)
```

## 12.4 Delta Concentration

Measures how much of the bar's net delta is concentrated around specific price levels.

## 12.5 Delta Distribution

The entire delta distribution can be analyzed across prices.

---

# 13. Imbalance Indicators

The footprint structure allows bid/ask imbalance calculations.

For a price level:

```text
buy_imbalance =
    ask_volume / opposing_bid_volume
```

or:

```text
sell_imbalance =
    bid_volume / opposing_ask_volume
```

Exact comparison rules depend on how adjacent prices are paired.

Possible indicators include:

- Buy imbalance
- Sell imbalance
- Diagonal imbalance
- Imbalance ratio
- Imbalance percentage
- Maximum imbalance
- Number of imbalanced levels
- Stacked buy imbalances
- Stacked sell imbalances
- Imbalance clusters

---

# 14. Stacked Imbalances

Multiple consecutive price levels can be examined for directional imbalance.

Possible indicators:

```text
stacked_buy_imbalance_count
stacked_sell_imbalance_count
largest_buy_stack
largest_sell_stack
```

These are particularly useful for footprint-based strategies.

---

# 15. Absorption Indicators

The available data can be used to construct absorption proxies.

Examples:

- High volume with limited price movement
- High aggressive buying with limited upward progress
- High aggressive selling with limited downward progress
- Large volume concentration at a price
- Large trade concentration at a price

Possible derived measures include:

```text
volume / range
delta / range
aggressive_volume / price_change
```

These are **derived interpretations**, not direct measurements of resting liquidity.

---

# 16. Effort vs Result Indicators

The aggregator provides the necessary inputs for effort/result analysis.

Examples:

```text
effort = volume
result = abs(close - open)
```

or:

```text
effort = volume
result = high - low
```

Possible ratios:

```text
volume / range
delta / range
volume / body
delta / body
```

These can identify bars where significant trading activity produced relatively little price movement.

---

# 17. Momentum Indicators

Using OHLC and derived bar values, standard momentum indicators can be calculated.

Examples:

- Rate of Change (ROC)
- Momentum
- RSI
- Stochastic Oscillator
- Williams %R
- CCI
- Awesome Oscillator
- MACD
- PPO

The aggregator itself does not calculate these; it provides the underlying bar series.

---

# 18. Trend Indicators

Using OHLC or derived price series:

- SMA
- EMA
- WMA
- HMA
- DEMA
- TEMA
- VWMA
- MACD
- ADX
- DMI
- Aroon
- Supertrend
- Moving-average slope

Volume-aware trend variants can also be created.

---

# 19. Volatility Indicators

The OHLC history supports:

- True Range
- ATR
- Average True Range
- Historical volatility
- Rolling standard deviation
- Bollinger Bands
- Bollinger Band Width
- Keltner Channels
- Donchian Channels
- Range expansion
- Volatility percentile
- Realized volatility

For example:

```text
TR =
    max(
        high - low,
        abs(high - previous_close),
        abs(low - previous_close)
    )
```

---

# 20. Price-Volume Relationship Indicators

Because both price and volume are available:

- OBV
- Volume Price Trend
- Price Volume Rank
- VWMA
- Volume-weighted momentum
- Volume-weighted ROC
- Price/volume divergence
- Delta/price divergence
- Volume/range divergence

---

# 21. Order-Flow Divergence

The combination of price and delta enables divergence analysis.

Examples:

### Bullish Delta Divergence

```text
price makes a lower low
delta makes a higher low
```

### Bearish Delta Divergence

```text
price makes a higher high
delta makes a lower high
```

Other divergence combinations:

- Price vs cumulative delta
- Price vs rolling delta
- Price vs volume
- Price vs trade count
- Price vs aggressive buy volume
- Price vs aggressive sell volume

---

# 22. Session and Anchored Indicators

If the Series layer supports resets or anchors, the data can be accumulated by:

- Trading session
- Day
- Week
- Month
- Market open
- Custom timestamp
- Event
- Swing point

This enables:

- Session VWAP
- Session volume
- Session delta
- Session cumulative delta
- Session POC
- Session VAH
- Session VAL
- Anchored VWAP
- Anchored cumulative delta
- Anchored volume profile

---

# 23. Statistical Indicators

Because the Series can retain historical bars, standard statistical calculations are possible.

Examples:

- Mean
- Median
- Variance
- Standard deviation
- Z-score
- Percentile
- Quantile
- Min/max
- Range
- Interquartile range
- Skewness
- Kurtosis
- Correlation
- Covariance
- Linear regression
- Regression slope
- R-squared

These can be applied to:

- close
- returns
- volume
- delta
- trade count
- VWAP
- range
- trade size
- POC
- any derived series

---

# 24. Return-Based Indicators

From closing prices:

```text
return = close / previous_close - 1
```

Possible indicators:

- Simple returns
- Log returns
- Rolling returns
- Cumulative returns
- Return volatility
- Sharpe-style statistics
- Downside deviation
- Maximum drawdown
- Recovery factor

---

# 25. Footprint-Specific Indicators

The combination of `volume_at_price` and aggressor classification enables specialized footprint analytics such as:

- POC migration
- POC distance from close
- POC distance from VWAP
- POC migration speed
- Value Area migration
- Value Area expansion
- Value Area contraction
- Delta concentration
- Delta extremes
- Buy/sell imbalance count
- Stacked imbalance count
- Large trade concentration
- Maximum trade location
- Maximum buy trade location
- Maximum sell trade location
- Volume concentration around POC
- Volume distribution skew
- Volume distribution kurtosis
- High-volume nodes
- Low-volume nodes
- Single-print-style structures, subject to the exact profile representation

---

# 26. Composite Indicators

The strongest indicators will often combine several primitives.

Examples:

## Delta Efficiency

```text
delta_efficiency =
    abs(delta) / total_volume
```

## Price Efficiency

```text
price_efficiency =
    abs(close - open) / (high - low)
```

## Volume Efficiency

```text
volume_efficiency =
    total_volume / (high - low)
```

## Order-Flow Efficiency

```text
order_flow_efficiency =
    abs(delta) / (high - low)
```

## Aggression Bias

```text
aggression_bias =
    (ask_volume - bid_volume)
    / (ask_volume + bid_volume)
```

## Large Trade Pressure

A custom metric can combine:

- maximum trade
- maximum buy trade
- maximum sell trade
- total volume
- delta

This allows more sophisticated trade-flow classifications.

---

# 27. What the Aggregator Cannot Directly Provide

The aggregator is trade-based. It does **not** contain a full order book.

Therefore, the following cannot be measured directly from this data alone:

- Resting bid liquidity
- Resting ask liquidity
- Limit order additions
- Limit order cancellations
- Queue position
- Order-book depth
- Bid/ask spread at every moment
- Order-book imbalance
- Market-by-order information
- Hidden liquidity
- Iceberg detection with certainty

Some of these can be approximated indirectly, but they should not be presented as direct measurements.

For example, aggressive volume at a price is **not the same thing as resting liquidity at that price**.

---

# 28. Recommended Indicator Architecture

The clean separation should be:

```text
Tick
  ↓
External Reorder Buffer
  ↓
BarAggregator
  ↓
Bar
  ├── OHLC
  ├── Volume
  ├── Delta
  ├── Trade statistics
  ├── VWAP accumulator
  └── Volume-at-Price
          ↓
      Timeframe
          ↓
       Series
          ↓
    Derived Indicators
```

The `BarAggregator` should remain responsible for **aggregation and mathematically exact accumulation**.

The `Series` layer should be responsible for:

- historical windows
- rolling calculations
- indicator state
- indicator dependencies
- cross-bar calculations
- derived statistics

This separation prevents the aggregator from becoming an indicator engine.

---

# 29. Indicator Capacity Summary

A useful way to classify the available indicator space is:

| Category | Examples | Data Required |
|---|---|---|
| Price | Range, body, wick, CLV | OHLC |
| Volume | SMA, EMA, RVOL, Z-score | Volume |
| VWAP | VWAP, deviation, bands | Price + volume |
| Delta | Delta, cumulative delta, delta ratio | Buy/sell volume |
| Trade flow | Avg trade, trade intensity | Volume + trades |
| Trade size | Min/max, large-trade metrics | Trade sizes |
| Footprint | POC, delta profile, volume profile | Volume-at-price |
| Value Area | VAH, VAL, POC | Volume profile |
| Imbalance | Buy/sell imbalance, stacks | Bid/ask by price |
| Absorption | Effort/result proxies | Volume + price + delta |
| Momentum | RSI, ROC, CCI, MACD | Historical price |
| Trend | SMA, EMA, ADX, DMI | Historical price |
| Volatility | ATR, BB, HV, TR | Historical OHLC |
| Statistics | Z-score, regression, correlation | Historical series |
| Divergence | Price/delta, price/volume | Multiple series |
| Session | Session VWAP, delta, profile | Time + historical aggregation |
| Composite | Efficiency, aggression, pressure | Multiple fields |

There is therefore **no small fixed number of indicators**. The aggregator exposes a sufficiently rich feature set to support **dozens of standard indicators and hundreds of custom derived metrics**, depending on how the Series and Indicator layers are implemented.

---

# 30. Core Mathematical Invariants

The following invariants should remain true for every valid bar.

```text
total_volume = bid_volume + ask_volume

delta = ask_volume - bid_volume

trades = Σ PriceLevel.trades

total_volume = Σ PriceLevel.total_volume

bid_volume = Σ PriceLevel.bid_volume

ask_volume = Σ PriceLevel.ask_volume

volume_price_sum =
    Σ(price × PriceLevel.total_volume)

VWAP =
    volume_price_sum / total_volume
```

For a non-empty bar:

```text
low <= open <= high
low <= close <= high

min_trade <= max_trade

abs(delta) <= total_volume

low <= VWAP <= high
```

These invariants are the mathematical foundation that allows the downstream indicator layer to trust the aggregated data.