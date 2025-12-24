import { Instrument } from "./instruments";

export const tradingSymbols: Instrument[] = [
  {
    id: "postgress-uuid",
    internalId: "binance-btc-usdt",
    idempotentId: "binance-btc-usdt",
    
    symbol: "BTCUSDT",
    symbolDisplay: "BTC/USDT",
    description: "Bitcoin / Tether USD",

    base: "BTC",
    quote: "USDT",

    exchange: "binance",
    exchangeCountry: "MT",
    market: "crypto",
    type: "spot",

    providerName: "binance",
    providerId: "BTCUSDT",
    providerSymbol: "BTCUSDT",

    status: "active",
    isHidden: false,
    isSynthetic: false,

    tickSize: 0.01,
    stepSize: 0.0001,
    pricePrecision: 2,
    quantityPrecision: 4,
    minQuantity: 0.0001,
    maxQuantity: 100,
    lotSize: 0.1,
    contractSize: 100,
    minOrderValue: 10,
    maxOrderValue: 20,
    displayDecimals: 2,

    leverage: 1,
    leverageMax: 1,
    marginType: ["isolated", "cross"],

   

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

    orderBookEndpoint: "wss://stream.binance.com/ws/btcusdt@depth",
    tradesEndpoint: "wss://stream.binance.com/ws/btcusdt@trade",
  },
];
