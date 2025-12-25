import { Instrument, InstrumentMarket } from "./instruments";

export const BTCUSDT_SPOT: Instrument = {
  /** Database UUID v7 */
  id: "018f5f3c-9c5a-7b92-bb2a-8c3a6f9e8d21",

  /** Stable internal business key */
  internalId: "binance-btc-usdt-spot",

  /** Search engine primary key */
  idempotentId: "binance:BTCUSDT:spot",

  /** Trading symbol */
  symbol: "BTCUSDT",

  /** Display symbol */
  symbolDisplay: "BTC/USDT",

  /** Human readable name */
  description: "Bitcoin / Tether USD Spot Market",

  /** Base & quote assets */
  base: "BTC",
  quote: "USDT",

  /** Exchange info */
  exchange: "Binance",
  exchangeCountry: "MT",

  /** Market classification */
  market: InstrumentMarket.CRYPTO,
  type: "spot",

  /** Data provider */
  providerName: "Binance",
  providerId: "BTCUSDT",
  providerSymbol: "BTCUSDT",

  /** Trading status */
  status: "active",
  isHidden: false,
  isSynthetic: false,

  /** Standard identifiers (not applicable for crypto) */
  isin: undefined,
  cusip: undefined,

  /** Price rules */
  tickSize: 0.01,
  pricePrecision: 2,

  /** Quantity rules (step-based model) */
  stepSize: 0.0001,
  quantityPrecision: 4,

  /** Quantity limits */
  minQuantity: 0.0001,
  maxQuantity: 1000,

  /** Notional limits */
  minOrderValue: 10,
  maxOrderValue: 10_000_000,

  /** UI display */
  displayDecimals: 2,

  /** Margin / leverage (spot → not applicable) */
  leverage: undefined,
  leverageMax: undefined,
  supportedMarginTypes: [],

  /** Fees */
  feeTier: "standard",
  makerFee: 0.001,
  takerFee: 0.001,
  typicalSpread: 0.0002,

  /** Trading hours (24/7 crypto) */
  timezone: "UTC",

  /** UI metadata */
  tags: ["crypto", "bitcoin", "spot"],
  priority: 1,
  iconUrl: "https://assets.exchange.com/icons/btc.svg",
  highlightColor: "#f7931a",

  /** Search optimization */
  symbol_aliases: ["XBTUSDT", "BTC-USDT"],
  fullTextSearch: "BTC BTCUSDT BTC/USDT Bitcoin Tether Binance",
  symbol_lc: "btcusdt",
  search_terms: ["bitcoin", "btc", "usdt"],

  /** Metadata */
  createdAt: "2024-12-01T00:00:00Z",
  updatedAt: "2024-12-01T00:00:00Z",

  /** Market data endpoints */
  orderBookEndpoint: "wss://stream.binance.com/ws/btcusdt@depth",
  tradesEndpoint: "wss://stream.binance.com/ws/btcusdt@trade",
};

export const tradingSymbols: Instrument[] = [BTCUSDT_SPOT];
