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