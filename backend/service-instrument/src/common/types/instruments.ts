import { z } from "zod";
import { Decimal } from "decimal.js";
import { areIntervalsOverlapping, parse, addDays, isEqual } from "date-fns";

/* ============================================================
 * DECIMAL HELPERS
 * ============================================================ */

/**
 * DecimalSchema
 * - Rechaza strings vacíos o con solo espacios
 * - Normaliza strings (trim)
 * - Previene NaN e Infinity
 */
export const DecimalSchema = z
  .union([z.string().trim().min(1), z.number().finite()])
  .transform((val, ctx) => {
    try {
      const normalized =
        typeof val === "string" ? val.trim() : val;

      const d = new Decimal(normalized);

      if (!d.isFinite()) {
        throw new Error();
      }

      return d;
    } catch {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Invalid decimal value",
      });
      return z.NEVER;
    }
  });

export const PositiveDecimal = DecimalSchema.refine(
  (v) => v.gt(0),
  { message: "Must be greater than 0" }
);

export const NonNegativeDecimal = DecimalSchema.refine(
  (v) => v.gte(0),
  { message: "Must be greater than or equal to 0" }
);

export const NegativeDecimal = DecimalSchema.refine(
  (v) => v.lt(0),
  { message: "Must be less than 0" }
);

/* ============================================================
 * ENUMS
 * ============================================================ */

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

export const InstrumentMarginTypeSchema = z.enum([
  "cross",
  "isolated",
]);

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

const ISO_3166_1_ALPHA_2 = /^[A-Z]{2}$/;

/**
 * Settlement delay
 * - Flexible: supports T+0, T+1, T+2, ...
 */
export const SettlementDelaySchema = z
  .string()
  .regex(/^T\+\d+$/, "Settlement delay must follow T+N format");

/* ============================================================
 * TRADING HOURS
 * ============================================================ */

export const TradingHoursSchema = z.object({
  days: z
    .array(z.number().int().min(0).max(6))
    .min(1)
    .refine((arr) => new Set(arr).size === arr.length, {
      message: "Days cannot contain duplicates",
    }),

  sessions: z
    .array(
      z.object({
        open: z.string().regex(/^([0-1]\d|2[0-3]):[0-5]\d$/),
        close: z.string().regex(/^([0-1]\d|2[0-3]):[0-5]\d$/),
      })
    )
    .min(1)
    .superRefine((sessions, ctx) => {
      const errors = validateTradingSessions(sessions);

      for (const err of errors) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: err.message,
          path: err.index !== undefined ? [err.index] : undefined,
        });
      }
    }),
});

export const ExtendedHoursSchema = z.object({
  preMarket: TradingHoursSchema,
  afterHours: TradingHoursSchema,
});

/* ============================================================
 * CIRCUIT BREAKER
 * ============================================================ */

/**
 * Ratios expressed from 0 to 1 (e.g. 0.1 = 10%)
 */
export const CircuitBreakerSchema = z.object({
  upperLimitRatio: z
    .number()
    .min(0)
    .max(1, "Upper limit cannot exceed 100%"),

  lowerLimitRatio: z
    .number()
    .min(-1, "Lower limit cannot be less than -100%")
    .max(0),

  duration: z
    .number()
    .int()
    .positive()
    .max(86400, "Duration cannot exceed 24 hours (86400 seconds)"),
});

/* ============================================================
 * ORDER TYPES
 * ============================================================ */

export const OrderTypeSchema = z.enum([
  "market",
  "limit",
  "stop",
  "stop_limit",
]);

/* ============================================================
 * INSTRUMENT SCHEMA
 * ============================================================ */

export const InstrumentSchema = z
  .object({
    id: z.string().uuid(),
    internalId: z.string().min(1),
    idempotentId: z.string().min(1),

    symbol: z.string().min(1),
    symbolDisplay: z.string().min(1),
    symbolLc: z.string().transform(v => v.toLowerCase()),


    description: z.string().min(1),

    base: z.string().min(1),
    quote: z.string().min(1),

    exchange: z.string().min(1),
    exchangeCountry: z.string().regex(ISO_3166_1_ALPHA_2),

    market: InstrumentMarketSchema,
    type: InstrumentTypeSchema,
    status: InstrumentStatusSchema,

    providerName: z.string().min(1),
    providerId: z.string().min(1),
    providerSymbol: z.string().min(1),

    isHidden: z.boolean(),
    isSynthetic: z.boolean(),

    isin: z.string().optional(),
    cusip: z.string().optional(),

    tickSize: PositiveDecimal,
    stepSize: PositiveDecimal.optional(),
    lotSize: PositiveDecimal.optional(),

    pricePrecision: z.number().int().nonnegative(),
    quantityPrecision: z.number().int().nonnegative().optional(),

    minQuantity: PositiveDecimal,
    maxQuantity: PositiveDecimal,

    minOrderValue: PositiveDecimal,
    maxOrderValue: PositiveDecimal,

    displayDecimals: z.number().int().nonnegative(),

    makerFee: NonNegativeDecimal.refine(
      (v) => v.lte(1),
      { message: "Maker fee cannot exceed 100%" }
    ),

    takerFee: NonNegativeDecimal.refine(
      (v) => v.lte(1),
      { message: "Taker fee cannot exceed 100%" }
    ),

    isTradable: z.boolean(),
    requiresKYC: z.boolean(),

    timezone: z
      .string()
      .refine((tz) => {
        try {
          Intl.DateTimeFormat(undefined, { timeZone: tz });
          return true;
        } catch {
          return false;
        }
      })
      .optional(),

    tradingHours: TradingHoursSchema.optional(),
    extendedHours: ExtendedHoursSchema.optional(),

    supportedOrderTypes: z.array(OrderTypeSchema).min(1),
  })
  .superRefine((data, ctx) => {
    /* ==================================================
     * SYMBOL NORMALIZATION
     * ================================================== */

    if (data.symbolLc !== data.symbol.toLowerCase()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "symbolLc must be lowercase version of symbol",
        path: ["symbolLc"],
      });
    }

    /* ==================================================
     * PRICE PRECISION
     * ================================================== */

    const tickDecimals = data.tickSize.decimalPlaces();

    if (data.pricePrecision !== tickDecimals) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "pricePrecision must equal tickSize decimal places",
        path: ["pricePrecision"],
      });
    }

    /* ==================================================
     * QUANTITY MODEL
     * ================================================== */

    const hasStep = data.stepSize !== undefined;
    const hasLot = data.lotSize !== undefined;
    const hasQtyPrecision = data.quantityPrecision !== undefined;

    if (hasStep && hasLot) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Define either stepSize or lotSize, not both",
        path: ["stepSize"],
      });
    }

    if (hasStep && !hasQtyPrecision) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "quantityPrecision is required when stepSize is defined",
        path: ["quantityPrecision"],
      });
    }

    if (
      hasStep &&
      hasQtyPrecision &&
      data.quantityPrecision !== data.stepSize!.decimalPlaces()
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "quantityPrecision must equal stepSize decimal places",
        path: ["quantityPrecision"],
      });
    }

    /* ==================================================
     * RANGE COHERENCE
     * ================================================== */

    if (data.minQuantity.gte(data.maxQuantity)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "minQuantity must be less than maxQuantity",
        path: ["minQuantity"],
      });
    }

    if (data.minOrderValue.gte(data.maxOrderValue)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "minOrderValue must be less than maxOrderValue",
        path: ["minOrderValue"],
      });
    }
  });

/* ============================================================
 * TRADING SESSION VALIDATION
 * ============================================================ */

function validateTradingSessions(
  sessions: Array<{ open: string; close: string }>
): Array<{ index?: number; message: string }> {
  const errors: Array<{ index?: number; message: string }> = [];
  const baseDate = new Date(2000, 0, 1);

  const intervals = sessions.map((session, i) => {
    const start = parse(session.open, "HH:mm", baseDate);
    let end = parse(session.close, "HH:mm", baseDate);

    if (isEqual(start, end)) {
      errors.push({
        index: i,
        message: "Close time cannot equal open time",
      });
    }

    if (end < start) {
      end = addDays(end, 1);
    }

    if (end.getTime() - start.getTime() < 60_000) {
      errors.push({
        index: i,
        message: "Session duration must be at least 1 minute",
      });
    }

    return { start, end };
  });

  for (let i = 0; i < intervals.length; i++) {
    for (let j = i + 1; j < intervals.length; j++) {
      if (
        areIntervalsOverlapping(intervals[i], intervals[j], {
          inclusive: false,
        })
      ) {
        errors.push({
          index: j,
          message: `Sessions ${i} and ${j} overlap`,
        });
      }
    }
  }

  return errors;
}
