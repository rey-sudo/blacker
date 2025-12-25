import { Instrument, InstrumentMarginType, InstrumentMarket, InstrumentType } from "./instruments";

export const BTCUSDT_SPOT: Instrument = {
  id: "018f5f3c-9c5a-7b92-bb2a-8c3a6f9e8d21",
  internalId: "binance-btc-usdt-spot",
  idempotentId: "binance:BTCUSDT:spot",
  symbol: "BTCUSDT",
  symbolDisplay: "BTC/USDT",
  description: "Bitcoin / Tether USD Spot Market",
  base: "BTC",
  quote: "USDT",

  exchange: "Binance",
  exchangeCountry: "MT",
  market: InstrumentMarket.CRYPTO,
  type: InstrumentType.SPOT,
  providerName: "Binance",
  providerId: "BTCUSDT",
  providerSymbol: "BTCUSDT",
  status: "active",
  isHidden: false,
  isSynthetic: false,
  isin: undefined,
  cusip: undefined,
  tickSize: 0.01,
  pricePrecision: 2,
  stepSize: 0.0001,
  quantityPrecision: 4,
  minQuantity: 0.0001,
  maxQuantity: 1000,
  minOrderValue: 10,
  maxOrderValue: 10_000_000,
  displayDecimals: 2,
  leverage: undefined,
  leverageMax: undefined,
  supportedMarginTypes: [InstrumentMarginType.CROSS, InstrumentMarginType.ISOLATED],

  feeTier: "standard",
  makerFee: 0.001,
  takerFee: 0.001,
  typicalSpread: 0.0002,

  timezone: "UTC",
  tags: ["crypto", "bitcoin", "spot"],
  priority: 1,

  iconUrl: "https://assets.exchange.com/icons/btc.svg",
  highlightColor: "#f7931a",

  symbol_aliases: ["XBTUSDT", "BTC-USDT"],
  fullTextSearch: "BTC BTCUSDT BTC/USDT Bitcoin Tether Binance",

  createdAt: 1766633012791,
  updatedAt: 1766633012791,

  symbol_lc: "btcusdt",
  search_terms: ["bitcoin", "btc", "usdt"],

  supportedTimeframes: ["1h"],

  supportsOHLCV: true,
};

export const tradingSymbols: Instrument[] = [BTCUSDT_SPOT];
