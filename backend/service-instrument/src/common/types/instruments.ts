import { z } from "zod";
import { Decimal } from "decimal.js";
import { areIntervalsOverlapping, parse, addDays, isEqual } from "date-fns";

// ----------------------- DECIMALS -----------------------
export const DecimalSchema = z
  .union([z.string().trim().min(1), z.number().finite()])
  .transform((val) => new Decimal(val))
  .refine((val) => val.isFinite(), { message: "Invalid decimal value" });

export const PositiveDecimal = DecimalSchema.refine((v) => v.gt(0), {
  message: "Must be greater than 0",
});

export const NonNegativeDecimal = DecimalSchema.refine((v) => v.gte(0), {
  message: "Must be greater than or equal to 0",
});

export const NegativeDecimal = DecimalSchema.refine((v) => v.lt(0), {
  message: "Must be less than 0",
});

// ----------------------- ENUMS -----------------------
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

// ----------------------- TRADING HOURS -----------------------
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
    .min(1),
});

export const ExtendedHoursSchema = z.object({
  preMarket: TradingHoursSchema,
  afterHours: TradingHoursSchema,
});

// ----------------------- CIRCUIT BREAKER -----------------------
export const CircuitBreakerSchema = z.object({
  upperLimitPercent: z
    .number()
    .positive()
    .max(1, "Upper limit cannot exceed 100%"),
  lowerLimitPercent: z
    .number()
    .negative()
    .min(-1, "Lower limit cannot be less than -100%"),
  duration: z
    .number()
    .int()
    .positive()
    .max(86400, "Duration cannot exceed 24 hours (86400 seconds)"),
});

// ----------------------- ORDER TYPES -----------------------
export const OrderTypeSchema = z.enum([
  "market",
  "limit",
  "stop",
  "stop_limit",
]);

// ----------------------- UTILS -----------------------
const ISO_3166_1_ALPHA_2 = /^[A-Z]{2}$/;

// Tolerancia para comparaciones de decimales
const DECIMAL_EPSILON = new Decimal("1e-12");

function isMultipleOf(
  value: Decimal,
  increment: Decimal,
  allowFractional: boolean,
  isLot: boolean
) {
  if (isLot && allowFractional) return true;
  const remainder = value.div(increment).mod(1);
  return (
    remainder.lt(DECIMAL_EPSILON) ||
    remainder.gt(new Decimal(1).minus(DECIMAL_EPSILON))
  );
}

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
        message: `Session ${i}: Close time cannot equal open time (${session.open})`,
      });
    }

    if (end < start) end = addDays(end, 1);

    return { start, end, index: i, session };
  });

  for (let i = 0; i < intervals.length; i++) {
    for (let j = i + 1; j < intervals.length; j++) {
      if (
        areIntervalsOverlapping(
          { start: intervals[i].start, end: intervals[i].end },
          { start: intervals[j].start, end: intervals[j].end },
          { inclusive: false }
        )
      ) {
        errors.push({
          message: `Sessions ${i} and ${j} overlap: [${intervals[i].session.open}-${intervals[i].session.close}] overlaps with [${intervals[j].session.open}-${intervals[j].session.close}]`,
        });
      }
    }
  }

  return errors;
}

// ----------------------- INSTRUMENT SCHEMA -----------------------
export const InstrumentSchema = z
  .object({
    id: z.string().uuid(),
    internalId: z.string().min(1),
    idempotentId: z.string().min(1),
    symbol: z.string().min(1),
    symbolDisplay: z.string().min(1),
    description: z.string().min(1),
    base: z.string().min(1),
    quote: z.string().min(1),
    exchange: z.string().min(1),
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
    tickSize: PositiveDecimal,
    stepSize: PositiveDecimal.optional(),
    pricePrecision: z.number().int().nonnegative(),
    quantityPrecision: z.number().int().nonnegative().optional(),
    minQuantity: PositiveDecimal,
    maxQuantity: PositiveDecimal,
    minOrderValue: PositiveDecimal,
    maxOrderValue: PositiveDecimal,
    lotSize: PositiveDecimal.optional(),
    contractSize: z.number().positive().optional(),
    contractSizeUnit: z.string().optional(),
    displayDecimals: z.number().int().nonnegative(),
    leverage: z.number().min(1).optional(),
    leverageMax: z.number().min(1).optional(),
    supportedMarginTypes: z.array(InstrumentMarginTypeSchema).optional(),
    initialMargin: z.number().nonnegative().max(1).optional(),
    maintenanceMargin: z.number().nonnegative().max(1).optional(),
    expiryDate: z.string().datetime().optional(),
    settlementType: z.string().optional(),
    settlementDelay: SettlementDelaySchema.optional(),
    priceMultiplier: z.number().positive().optional(),
    pricingCurrency: z.string().optional(),
    underlyingAsset: z.string().optional(),
    settlementCurrency: z.string().optional(),
    tradingHours: TradingHoursSchema.optional(),
    extendedHours: ExtendedHoursSchema.optional(),
    circuitBreaker: CircuitBreakerSchema.optional(),
    supportedOrderTypes: z.array(OrderTypeSchema).min(1),
    tags: z.array(z.string()),
    priority: z.number().int().min(0).max(1000).optional(),
    iconUrl: z.string(),
    highlightColor: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/),
    symbol_aliases: z.array(z.string()),
    fullTextSearch: z.string().min(1),
    feeTier: z.string().optional(),
    makerFee: NonNegativeDecimal.refine((v) => v.lte(1)),
    takerFee: NonNegativeDecimal.refine((v) => v.lte(1)),
    typicalSpread: z.number().nonnegative().optional(),
    isTradable: z.boolean(),
    requiresKYC: z.boolean(),
    regulation: z.string().optional(),
    timezone: z.string().optional(),
    createdAt: z.number().int().nonnegative(),
    updatedAt: z.number().int().nonnegative(),
    symbolLc: z.string(),
    search_terms: z.array(z.string()).optional(),
    supportedTimeframes: z.array(z.string()).min(1),
    supportsOHLCV: z.boolean(),
    restrictedCountries: z.array(z.string().regex(ISO_3166_1_ALPHA_2)),
    allowFractionalLot: z.boolean(),
  })
  .superRefine((data, ctx) => {
    const increment = data.stepSize ?? data.lotSize;
    const hasStep = !!data.stepSize;
    const hasLot = !!data.lotSize;
    const hasQtyPrecision = data.quantityPrecision !== undefined;

    // -------------------- Step/Lot/Quantity --------------------
    if (hasStep && hasLot)
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Define either stepSize or lotSize, not both",
        path: ["stepSize"],
      });
    if (hasStep && !hasQtyPrecision)
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "quantityPrecision is required when stepSize is defined",
        path: ["quantityPrecision"],
      });
    if (!hasStep && hasQtyPrecision)
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "quantityPrecision requires stepSize",
        path: ["quantityPrecision"],
      });
    if (hasLot && hasQtyPrecision)
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "quantityPrecision is invalid when lotSize is used",
        path: ["quantityPrecision"],
      });
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

    if (increment) {
      if (
        !isMultipleOf(
          data.minQuantity,
          increment,
          data.allowFractionalLot,
          hasLot
        )
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "minQuantity must be a multiple of stepSize or lotSize",
          path: ["minQuantity"],
        });
      }
      if (
        !isMultipleOf(
          data.maxQuantity,
          increment,
          data.allowFractionalLot,
          hasLot
        )
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "maxQuantity must be a multiple of stepSize or lotSize",
          path: ["maxQuantity"],
        });
      }
      if (data.minQuantity.lt(increment))
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "minQuantity must be >= stepSize or lotSize",
          path: ["minQuantity"],
        });
      if (data.maxQuantity.lt(increment))
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "maxQuantity must be >= stepSize or lotSize",
          path: ["maxQuantity"],
        });
    }

    if (data.minQuantity.gte(data.maxQuantity))
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "minQuantity must be less than maxQuantity",
        path: ["minQuantity"],
      });

    // -------------------- Price --------------------
    const tickDecimals = data.tickSize.decimalPlaces();
    if (data.pricePrecision !== tickDecimals)
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "pricePrecision must equal tickSize decimal places",
        path: ["pricePrecision"],
      });

    // -------------------- Order Values --------------------
    if (data.minOrderValue.lte(0))
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "minOrderValue must be > 0",
        path: ["minOrderValue"],
      });
    if (data.maxOrderValue.lte(0))
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "maxOrderValue must be > 0",
        path: ["maxOrderValue"],
      });
    if (data.minOrderValue.gte(data.maxOrderValue))
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "minOrderValue must be < maxOrderValue",
        path: ["minOrderValue"],
      });

    // -------------------- Leverage & Margins --------------------
    const leverageDefined = data.leverage !== undefined;
    const leverageMaxDefined = data.leverageMax !== undefined;

    if (leverageDefined && !leverageMaxDefined)
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "leverage requires leverageMax to be defined",
        path: ["leverageMax"],
      });
    if (
      leverageDefined &&
      leverageMaxDefined &&
      data.leverage! > data.leverageMax!
    )
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "leverage must be <= leverageMax",
        path: ["leverage"],
      });
    if (
      data.initialMargin !== undefined &&
      data.maintenanceMargin !== undefined &&
      data.initialMargin < data.maintenanceMargin
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "initialMargin must be >= maintenanceMargin",
        path: ["initialMargin"],
      });
    }

    // -------------------- Trading Hours --------------------
    if ((data.tradingHours || data.extendedHours) && !data.timezone)
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "timezone is required when tradingHours or extendedHours are defined",
        path: ["timezone"],
      });
    if (data.tradingHours && data.extendedHours)
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Use either tradingHours or extendedHours, not both",
        path: ["tradingHours"],
      });
    if (data.tradingHours) {
      validateTradingSessions(data.tradingHours.sessions).forEach((err) =>
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: err.message,
          path: ["tradingHours", "sessions", err.index ?? 0],
        })
      );
    }

    // -------------------- Contract Size --------------------
    if (data.contractSize && !data.contractSizeUnit)
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "contractSizeUnit is required when contractSize is defined",
        path: ["contractSizeUnit"],
      });

    // -------------------- Expiry --------------------
    if (data.expiryDate && !["futures", "options"].includes(data.market))
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "expiryDate is only valid for futures or options",
        path: ["expiryDate"],
      });
    if (
      data.expiryDate &&
      ["futures", "options"].includes(data.market) &&
      new Date(data.expiryDate) <= new Date()
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "expiryDate must be in the future",
        path: ["expiryDate"],
      });
    }

    // -------------------- Market-specific rules --------------------
    switch (data.market) {
      case "crypto":
        if (data.tradingHours || data.extendedHours)
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message:
              "Crypto markets trade 24/7 and must not define tradingHours",
            path: ["tradingHours"],
          });
        if (data.timezone)
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Crypto instruments must not define timezone",
            path: ["timezone"],
          });
        break;
      case "forex":
        if (!data.leverageMax)
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Forex instruments require leverageMax",
            path: ["leverageMax"],
          });
        if (!data.tradingHours)
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Forex instruments require tradingHours (typically 24/5)",
            path: ["tradingHours"],
          });
        break;
      case "stocks":
        if (hasStep)
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Stocks must not define stepSize",
            path: ["stepSize"],
          });
        if (!hasLot)
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Stocks require lotSize",
            path: ["lotSize"],
          });
        break;
      case "futures":
      case "options":
        if (!data.expiryDate)
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `${data.market} instruments require expiryDate`,
            path: ["expiryDate"],
          });
        break;
    }
  });
