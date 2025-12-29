import { z } from "zod";
import Decimal from "decimal.js";

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

