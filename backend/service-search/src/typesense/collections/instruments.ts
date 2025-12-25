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

  /** Visibility of the instrument for the search */
  isSynthetic: boolean;

  /** Standard identifiers */
  isin?: string;

  /** Standard identifiers */
  cusip?: string;

  /** The minimum allowed increase in price */
  tickSize: number;

  /** Minimum unit allowed to buy or sell the instrument.
  stepSize = 0.001,

  qty = 0.0015 ❌,

  qty = 0.0020 ✅.

 ❌  Warning stepSize && lotSize
  */
  stepSize?: number;

  /** Maximum number of decimal places allowed in the price */
  pricePrecision: number;

  /** Maximum number of decimal places allowed in the amount/quantity */
  quantityPrecision?: number;

  /** Minimum order quantity allowed for this instrument */
  minQuantity: number;

  /** Maximum order quantity allowed for this instrument */
  maxQuantity: number;

  /**Minimum notional value required to place an order.  notional = price × quantity*/
  minOrderValue: number;

  /**Maximum notional value required to place an order.  notional = price × quantity*/
  maxOrderValue: number;

  /** ❌ Warning stepSize && lotSize  */
  lotSize?: number;
  contractSize?: number;
  displayDecimals: number; // decimales para UI

  /** Margin / leverage info for derivatives */
  leverage?: number;
  leverageMax?: number;
  supportedMarginTypes: string[]; //"cross" | "isolated"
  initialMargin?: number;
  maintenanceMargin?: number;

  /** Expiry / settlement info for derivatives */
  expiryDate?: string;
  settlementType?: string; //"cash" | "physical"
  settlementDelay?: "T+0" | "T+1" | "T+2";
  priceMultiplier?: number;
  pricingCurrency?: string;
  underlyingAsset?: string;
  settlementCurrency?: string;

  tradingHours?: {
    open: string;
    close: string;
    days: number[];
  };

  /** UI / display */
  tags: string[];
  priority?: number; // ranking en frontend

  iconUrl: string;
  highlightColor: string;

  symbol_aliases: string[];
  fullTextSearch?: string; // fullTextSearch = symbol + symbolDisplay + description + aliases

  feeTier?: string;
  makerFee?: number;
  takerFee?: number;

  typicalSpread?: number;

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

  /**
   

  RULES:

1. stepSize XOR lotSize
2. lotSize → quantityPrecision forbidden, 
When an instrument is traded in fixed lots,
the use of decimal quantity precision is not allowed.
orders must be placed in whole multiples of the defined lot size.
lotSize = 100
100   (1 lot)
200   (2 lots)
300   (3 lots)

If lotSize is defined:
- quantityPrecision MUST NOT be defined
- stepSize MUST NOT be defined
- order quantities MUST be integer multiples of lotSize

Exactly ONE quantity model must be defined:
- lotSize
- OR stepSize + quantityPrecision


3. leverage only applies if leverageMax exists
4. contractSize only for derivatives
5. prices validated with tickSize
6. notional = price * quantity
7. tradingHours override 24/7


minQuantity ≤ quantity ≤ maxQuantity

minOrderValue ≤ price × quantity ≤ maxOrderValue

Leverage rules apply ONLY if leverageMax exists

If contractSize exists → instrument is derivative Quantity represents number of contracts

If settlementType exists → settlementCurrency MUST exist

(providerName, providerId) MUST be unique

fullTextSearch = symbol + symbolDisplay + description + aliases

makerFee and takerFee MUST be ≥ 0
typicalSpread MUST NOT be used for execution


RULES SUMMARY:

- tickSize enforces price granularity
- exactly one quantity model allowed
- lot-based instruments do not support decimals
- notional limits are mandatory
- leverage applies only to derivatives
- trading hours override 24/7 behavior
- market data is not stored in Instrument


   */
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
