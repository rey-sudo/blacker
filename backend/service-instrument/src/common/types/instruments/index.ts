import { z } from "zod";
import Decimal from "decimal.js";
export * from "./instrument-crypto-schema.js";

export const DecimalSchema = z
  .union([
    z.string(),
    z.number().refine(Number.isFinite),
    z.instanceof(Decimal),
  ])
  .transform((v) => new Decimal(v))
  .refine((v) => v.isFinite(), {
    message: "Decimal inválido",
  });

/**
 * Decimal positivo: > 0
 */
export const DecimalPositiveSchema = DecimalSchema.refine((v) => v.gt(0), {
  message: "Decimal debe ser mayor que 0",
});

/**
 * Decimal no negativo: ≥ 0
 */
export const DecimalNonNegativeSchema = DecimalSchema.refine((v) => v.gte(0), {
  message: "Decimal no puede ser negativo",
});

export const InstrumentTypeSchema = z.enum([
  "forex-spot",
  "forex-cfd",
  "crypto-spot",
]);

export const CreateInstrumentSchema = z
  .object({
    type: InstrumentTypeSchema,
    payload: z.unknown(),
    schemaVersion: z.literal(0),
  })
  .strict();

export const InstrumentMarginTypeSchema = z.enum(["cross", "isolated"]);

export const InstrumentStatusSchema = z.enum([
  "active",
  "inactive",
  "delisted",
  "halted",
]);

export const InstrumentOrderTypeSchema = z.enum([
  "market",
  "limit",
  "stop",
  "stop_limit",
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
