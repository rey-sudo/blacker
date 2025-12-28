import { z } from "zod";
import { Decimal } from "decimal.js";
import { areIntervalsOverlapping, parse, addDays, isEqual } from "date-fns";

/**
 * ============================================================
 * UTILS & BASE SCHEMAS
 * ============================================================
 */

export const DecimalSchema = z
  .string()
  .or(z.number())
  .transform((val) => new Decimal(val))
  .refine((val) => !val.isNaN(), { message: "Invalid decimal value" });

export const PositiveDecimal = DecimalSchema.refine((v) => v.gt(0), {
  message: "Must be greater than 0",
});

export const NonNegativeDecimal = DecimalSchema.refine((v) => v.gte(0), {
  message: "Must be greater than or equal to 0",
});

const ISO_3166_1_ALPHA_2 = /^[A-Z]{2}$/;

/**
 * ============================================================
 * ENUMS & TRADING HOURS
 * ============================================================
 */

export const InstrumentStatusSchema = z.enum([
  "active",
  "inactive",
  "delisted",
  "halted",
]);
export const InstrumentTypeSchema = z.enum([
  "spot",
  "futures",
  "options",
  "other",
]);
export const InstrumentMarginTypeSchema = z.enum(["cross", "isolated"]);
export const InstrumentMarketSchema = z.enum([
  "crypto",
  "stocks",
  "forex",
  "futures",
  "options",
  "indices",
  "commodities",
  "bonds",
  "etfs",
  "cfds",
  "funds",
  "rates",
  "synthetic",
  "other",
]);
export const SettlementDelaySchema = z.enum(["T+0", "T+1", "T+2"]);
export const OrderTypeSchema = z.enum([
  "market",
  "limit",
  "stop",
  "stop_limit",
]);

/**
 * Supports split-day trading (e.g., 09:00-12:00 and 13:00-16:00)
 */
export const TradingHoursSchema = z.object({
  /** Array of days (0=Sun, 6=Sat) */
  days: z
    .array(z.number().int().min(0).max(6))
    .min(1)
    .refine((arr) => new Set(arr).size === arr.length, {
      message: "Days cannot contain duplicates",
    }),
  /** Trading sessions in HH:mm format */
  sessions: z
    .array(
      z.object({
        open: z.string().regex(/^([0-1]\d|2[0-3]):[0-5]\d$/),
        close: z.string().regex(/^([0-1]\d|2[0-3]):[0-5]\d$/),
      })
    )
    .min(1),
});

/**
 * Percentage-based circuit breakers
 * Example: 0.10 = 10% movement limit
 */
export const CircuitBreakerSchema = z.object({
  upperLimitPercent: z.number().positive().max(1, "Max 100%"),
  lowerLimitPercent: z.number().negative().min(-1, "Min -100%"),
  duration: z.number().int().positive().max(86400, "Max 24h"),
});

/**
 * ============================================================
 * MAIN INSTRUMENT SCHEMA
 * ============================================================
 */

export const InstrumentSchema = z
  .object({
    /** Database primary key (UUID v7) */
    id: z.string().uuid(),
    /** Stable internal business identifier (e.g., "binance-btc-usdt") */
    internalId: z.string().min(1),
    /** Unique ID for search engines */
    idempotentId: z.string().min(1),
    /** Standard symbol (e.g., "BTCUSDT") */
    symbol: z.string().min(1),
    /** UI-friendly symbol (e.g., "BTC/USDT") */
    symbolDisplay: z.string().min(1),
    /** Full descriptive name */
    description: z.string().min(1),
    /** Asset being traded (e.g., "BTC") */
    base: z.string().min(1),
    /** Denomination asset (e.g., "USDT") */
    quote: z.string().min(1),
    /** Exchange name (e.g., "Binance") */
    exchange: z.string().min(1),
    /** ISO country code of exchange */
    exchangeCountry: z.string().regex(ISO_3166_1_ALPHA_2),
    market: InstrumentMarketSchema,
    type: InstrumentTypeSchema,
    providerName: z.string().min(1),
    providerId: z.string().min(1),
    providerSymbol: z.string().min(1),
    status: InstrumentStatusSchema,
    isHidden: z.boolean(),
    isSynthetic: z.boolean(),
    isin: z.string().optional(),
    cusip: z.string().optional(),

    // --- Precision & Sizing ---
    /** Minimum price increment */
    tickSize: PositiveDecimal,
    /** Minimum quantity increment (Continuous markets) */
    stepSize: PositiveDecimal.optional(),
    /** Fixed lot size (Discrete markets like Stocks) */
    lotSize: PositiveDecimal.optional(),
    /** Decimal places in price (Must match tickSize) */
    pricePrecision: z.number().int().nonnegative(),
    /** Decimal places in quantity (Must match stepSize) */
    quantityPrecision: z.number().int().nonnegative().optional(),
    /** UI-specific decimal display */
    displayDecimals: z.number().int().nonnegative(),

    minQuantity: PositiveDecimal,
    maxQuantity: PositiveDecimal,
    /** Minimum notional value (price * quantity) */
    minOrderValue: PositiveDecimal,
    /** Maximum notional value (price * quantity) */
    maxOrderValue: PositiveDecimal,

    // --- Derivatives & Margin ---
    contractSize: z.number().positive().optional(),
    contractSizeUnit: z.string().optional(),
    leverage: z.number().min(1).optional(),
    leverageMax: z.number().min(1).optional(),
    supportedMarginTypes: z.array(InstrumentMarginTypeSchema).min(1),
    /** Initial margin fraction (e.g., 0.10) */
    initialMargin: z.number().nonnegative().max(1).optional(),
    /** Maintenance margin fraction (e.g., 0.05) */
    maintenanceMargin: z.number().nonnegative().max(1).optional(),

    // --- Settlement & Temporal ---
    expiryDate: z.string().datetime().optional(),
    settlementType: z.string().optional(),
    settlementDelay: SettlementDelaySchema.optional(),
    priceMultiplier: z.number().positive().optional(),
    pricingCurrency: z.string().optional(),
    settlementCurrency: z.string().optional(),
    underlyingAsset: z.string().optional(),

    // --- Trading Configuration ---
    tradingHours: TradingHoursSchema.optional(),
    extendedHours: z
      .object({
        preMarket: TradingHoursSchema.optional(),
        afterHours: TradingHoursSchema.optional(),
      })
      .optional(),
    /** IANA Timezone (e.g., "America/New_York") */
    timezone: z
      .string()
      .refine(
        (tz) => {
          try {
            Intl.DateTimeFormat(undefined, { timeZone: tz });
            return true;
          } catch {
            return false;
          }
        },
        { message: "Invalid IANA timezone" }
      )
      .optional(),

    circuitBreaker: CircuitBreakerSchema.optional(),
    supportedOrderTypes: z.array(OrderTypeSchema).min(1),
    isTradable: z.boolean(),
    requiresKYC: z.boolean(),
    /** Maker fee (e.g., 0.001 for 0.1%) */
    makerFee: NonNegativeDecimal.refine((v) => v.lte(1), "Cannot exceed 100%"),
    /** Taker fee (e.g., 0.002 for 0.2%) */
    takerFee: NonNegativeDecimal.refine((v) => v.lte(1), "Cannot exceed 100%"),

    // --- Meta & Search ---
    tags: z.array(z.string()),
    priority: z.number().int().min(0).max(1000).optional(),
    iconUrl: z.string().url(),
    highlightColor: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/),
    symbol_aliases: z.array(z.string()),
    /** Automated: Lowercase symbol */
    symbol_lc: z.string().optional(),
    /** Automated: Flattened string for search indexing */
    fullTextSearch: z.string().optional(),

    // --- Systems ---
    createdAt: z.number().int().nonnegative(),
    updatedAt: z.number().int().nonnegative(),
    supportedTimeframes: z.array(z.string()).min(1),
    supportsOHLCV: z.boolean(),
    restrictedCountries: z.array(z.string().regex(ISO_3166_1_ALPHA_2)),
  })
  .superRefine((data, ctx) => {
    /** * 1. LEVERAGE & MARGIN CONSISTENCY
     */
    if (data.leverage && !data.leverageMax) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "leverageMax required if leverage is set",
        path: ["leverage"],
      });
    }
    if (data.leverage && data.leverageMax && data.leverage > data.leverageMax) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "leverage cannot exceed leverageMax",
        path: ["leverage"],
      });
    }
    if (
      data.initialMargin &&
      data.maintenanceMargin &&
      data.initialMargin < data.maintenanceMargin
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "initialMargin must be >= maintenanceMargin",
        path: ["initialMargin"],
      });
    }

    /** * 2. PRICE PRECISION
     */
    if (data.pricePrecision !== data.tickSize.decimalPlaces()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "pricePrecision must match tickSize decimal places",
        path: ["pricePrecision"],
      });
    }

    /** * 3. QUANTITY MODEL (STEP VS LOT)
     * Continuous: uses stepSize + quantityPrecision
     * Discrete: uses lotSize
     */
    if (data.stepSize && data.lotSize) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Cannot use both stepSize and lotSize",
        path: ["stepSize"],
      });
    }

    if (data.stepSize) {
      if (data.quantityPrecision === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "quantityPrecision required for stepSize",
          path: ["quantityPrecision"],
        });
      } else if (data.quantityPrecision !== data.stepSize.decimalPlaces()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "quantityPrecision mismatch with stepSize",
          path: ["quantityPrecision"],
        });
      }
      if (!data.minQuantity.mod(data.stepSize).isZero()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "minQuantity must be a multiple of stepSize",
          path: ["minQuantity"],
        });
      }
    }

    if (data.lotSize) {
      if (data.quantityPrecision !== undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "quantityPrecision cannot be set for lotSize (discrete)",
          path: ["quantityPrecision"],
        });
      }
      if (!data.minQuantity.mod(data.lotSize).isZero()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "minQuantity must be a multiple of lotSize",
          path: ["minQuantity"],
        });
      }
    }

    /** * 4. TRADING HOURS
     */
    if ((data.tradingHours || data.extendedHours) && !data.timezone) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "timezone required for trading hours",
        path: ["timezone"],
      });
    }

    if (data.tradingHours) {
      const errors = validateTradingSessions(data.tradingHours.sessions);
      errors.forEach((err) => {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: err.message,
          path: [
            "tradingHours",
            "sessions",
            ...(err.index !== undefined ? [err.index] : []),
          ],
        });
      });
    }

    /** * 5. LOGICAL BOUNDS
     */
    if (data.minQuantity.gte(data.maxQuantity)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "minQuantity < maxQuantity required",
        path: ["minQuantity"],
      });
    }
    if (data.minOrderValue.gte(data.maxOrderValue)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "minOrderValue < maxOrderValue required",
        path: ["minOrderValue"],
      });
    }
  })
  .transform((data) => ({
    ...data,
    // Automatically derive search fields to ensure they are never out of sync
    symbol_lc: data.symbol.toLowerCase(),
    fullTextSearch: `${data.symbol} ${data.symbolDisplay} ${
      data.description
    } ${data.symbol_aliases.join(" ")}`.toLowerCase(),
  }))
  .readonly();

export type Instrument = z.infer<typeof InstrumentSchema>;

/**
 * ============================================================
 * TRADING SESSION VALIDATOR
 * ============================================================
 */

function validateTradingSessions(
  sessions: Array<{ open: string; close: string }>
) {
  const errors: Array<{ index?: number; message: string }> = [];
  const baseDate = new Date(2000, 0, 1);

  const intervals = sessions.map((s, i) => {
    const start = parse(s.open, "HH:mm", baseDate);
    let end = parse(s.close, "HH:mm", baseDate);

    if (isEqual(start, end)) {
      errors.push({
        index: i,
        message: `Session duration cannot be zero (${s.open})`,
      });
    }

    // Support overnight: if close <= open, it ends on the following day
    if (end <= start) end = addDays(end, 1);

    return { start, end, index: i, s };
  });

  // Check for overlaps within the session array
  for (let i = 0; i < intervals.length; i++) {
    for (let j = i + 1; j < intervals.length; j++) {
      // { inclusive: false } allows one session to start exactly when another ends
      if (
        areIntervalsOverlapping(intervals[i], intervals[j], {
          inclusive: false,
        })
      ) {
        errors.push({
          message: `Overlap detected between session ${i} (${intervals[i].s.open}-${intervals[i].s.close}) and ${j} (${intervals[j].s.open}-${intervals[j].s.close})`,
        });
      }
    }
  }
  return errors;
}
