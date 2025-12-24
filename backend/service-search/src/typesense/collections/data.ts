import { Instrument } from "./instruments";

export const tradingSymbols: Instrument[] = [
  {
    id: "postgress uuid",
    internalId: "binance-btc-usdt",

    symbol: "BTCUSDT",
    symbolDisplay: "BTC/USDT",
    description: "Bitcoin / Tether USD",

    base: "BTC",
    quote: "USDT",

    exchange: "Binance",
    exchangeCountry: "MT",
    market: "crypto",
    type: "spot",

    externalId: "BTCUSDT",
    feedProvider: "binance",

    status: "active",
    isHidden: false,
    isSynthetic: false,

    tickSize: 0.01,
    stepSize: 0.0001,
    pricePrecision: 2,
    quantityPrecision: 4,
    minQuantity: 0.0001,
    minOrderValue: 10,
    displayDecimals: 2,

    lastPrice: 43250.25,
    bidPrice: 43250.2,
    askPrice: 43250.3,
    highPrice24h: 44010.5,
    lowPrice24h: 42500.1,
    priceChange24h: -1.23,
    volumeBase24h: 15432.12,
    volumeQuote24h: 665000000,

    isTradable: true,
    isMarginAllowed: true,
    supportsStopLimit: true,
    supportsMarginTrading: true,
    supportsFutures: true,
    requiresKYC: true,

    tags: ["crypto", "btc", "major", "spot"],
    priority: 1,

    iconUrl: "https://assets.exchange.com/icons/btc.svg",
    highlightColor: "#F7931A",

    symbol_aliases: ["BTC", "XBT"],
    symbol_lc: "btcusdt",
    search_terms: ["bitcoin", "btc", "tether", "usdt"],
    fullTextSearch: "bitcoin btc usdt btcusdt binance",

    timezone: "UTC",

    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-01T00:00:00Z",
    source: "binance",
    currency: "USDT",

    orderBookEndpoint: "wss://stream.binance.com/ws/btcusdt@depth",
    tradesEndpoint: "wss://stream.binance.com/ws/btcusdt@trade",
  },
];
