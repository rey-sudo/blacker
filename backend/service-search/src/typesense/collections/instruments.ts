export type Instrument = {
  /**Database UUID v7 primary key */
  id: string;

  /** Internal business identifier */
  internalId: string;

  /**Search frameworks primary key */
  idempotentId: string;

  /** Trading symbol (eg BTCUSDT, AAPL) */
  symbol: string;

  /** Display symbol for UI (eg BTC/USDT) */
  symbolDisplay: string;

  /** Descriptive name */
  description: string;

  /** Base asset */
  base: string;

  /** Quote asset */
  quote: string;

  /** Exchange name (Binance, NASDAQ, CME, etc) */
  exchange: string;

  /** Exchange country / jurisdiction */
  exchangeCountry: string;

  /** Market type (crypto, stocks, forex, futures) */
  market: string;

  /** Instrument type spot,futures,other  */
  type: string;

  /** Name of the data provider */
  providerName: string;

  /** External Instrument  */
  providerId: string; // ID en el exchange original

  providerSymbol: string;

  /** Status of the instrument active, inactive, delisted */
  status: string;

  /** Visibility of the instrument for the search */
  isHidden: boolean;

  isSynthetic: boolean;

  /** Standard identifiers */
  isin?: string;

  /** Standard identifiers */
  cusip?: string;

  /** Trading precision and limits */
  tickSize: number;
  stepSize: number;
  pricePrecision: number;
  quantityPrecision?: number;
  minQuantity: number;
  maxQuantity: number;
  minOrderValue: number;
  maxOrderValue: number;
  lotSize: number;
  contractSize: number;
  displayDecimals: number; // decimales para UI

  /** Margin / leverage info for derivatives */
  leverage: number;
  leverageMax: number;
  marginType: string[]; //"cross" | "isolated"
  initialMargin?: number;
  maintenanceMargin?: number;

  /** Expiry / settlement info for derivatives */
  expiryDate?: string;
  settlementType?: string; //"cash" | "physical"
  underlyingAsset?: string;
  settlementCurrency?: string;

  candlestickInterval?: string; // e.g., "1m", "5m", "1h"
  indicators?: Record<string, number>; // e.g., RSI, EMA, SMA

  /** UI / display */
  tags: string[];
  priority?: number; // ranking en frontend

  iconUrl: string;
  highlightColor: string;

  symbol_aliases: string[];
  fullTextSearch?: string; // concatenación para búsqueda rápida

  /** Security / regulation */
  isTradable?: boolean;
  isMarginAllowed?: boolean;
  requiresKYC?: boolean;
  supportsStopLimit?: boolean;
  supportsMarginTrading?: boolean;
  supportsFutures?: boolean;
  regulation?: string;

  /** Timezone for markets that operate in specific hours */
  timezone: string;

  /** Metadata / auditing */
  createdAt: string;
  updatedAt: string;

  /** References a live order book or trade feed (opcional) */
  orderBookEndpoint?: string;
  tradesEndpoint?: string;

  /** Optimización para búsqueda */
  symbol_lc?: string; // lowercase symbol para autocomplete
  search_terms?: string[]; // términos adicionales
};

const instrumentFields = [
  // Required primary key for typesense
  { name: "id", type: "string" },

  // Business identifiers
  { name: "internalId", type: "string", index: false },

  // Searchable fields
  { name: "symbol", type: "string" },
  { name: "description", type: "string", optional: true },

  // Filterable / faceted fields
  { name: "base", type: "string", facet: true },
  { name: "quote", type: "string", facet: true },
  { name: "exchange", type: "string", facet: true },
  { name: "market", type: "string", facet: true },
  { name: "type", type: "string", facet: true }, // spot | futures | other

  // Optional identifiers
  { name: "isin", type: "string", optional: true, index: false },
  { name: "cusip", type: "string", optional: true, index: false },
];

export const INSTRUMENTS_COLLECTION = "instruments";

export const instrumentsSchema = {
  name: INSTRUMENTS_COLLECTION,
  fields: instrumentFields,
};
