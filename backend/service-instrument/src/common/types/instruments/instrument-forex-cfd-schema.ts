import { z } from "zod";
import { DecimalSchema } from "./index.js";


/* ──────────────────────────────────────────────────────────
 * InstrumentForexCFDSchema
 * ────────────────────────────────────────────────────────── */
export const InstrumentForexCFDSchema = z
  .object({
    id: z.string().uuid(),

    symbol: z.string().transform((v) => v.toUpperCase()),

    baseCurrency: z
      .string()
      .length(3)
      .transform((v) => v.toUpperCase()),

    quoteCurrency: z
      .string()
      .length(3)
      .transform((v) => v.toUpperCase()),

    /* CFD-specific */
    contractSize: DecimalSchema.refine((v) => v.gt(0), {
      message: "contractSize debe ser mayor que 0",
    }),

    pipSize: DecimalSchema.refine((v) => v.gt(0), {
      message: "pipSize debe ser mayor que 0",
    }),

    minVolume: DecimalSchema.refine((v) => v.gt(0), {
      message: "minVolume debe ser mayor que 0",
    }),

    maxVolume: DecimalSchema.refine((v) => v.gt(0), {
      message: "maxVolume debe ser mayor que 0",
    }),

    spread: DecimalSchema.refine((v) => v.gte(0), {
      message: "spread no puede ser negativo",
    }),

    isActive: z.boolean().default(true),

    createdAt: z.date(),
    updatedAt: z.date(),
  })
  .superRefine((data, ctx) => {
    const {
      symbol,
      baseCurrency,
      quoteCurrency,
      contractSize,
      pipSize,
      minVolume,
      maxVolume,
      spread,
    } = data;

    /* 1️⃣ base / quote */
    if (baseCurrency === quoteCurrency) {
      ctx.addIssue({
        path: ["baseCurrency"],
        message: "baseCurrency y quoteCurrency no pueden ser iguales",
        code: z.ZodIssueCode.custom,
      });
    }

    /* 2️⃣ symbol coherente */
    const expectedSymbol = `${baseCurrency}/${quoteCurrency}`;
    if (symbol !== expectedSymbol) {
      ctx.addIssue({
        path: ["symbol"],
        message: `symbol debe ser ${expectedSymbol}`,
        code: z.ZodIssueCode.custom,
      });
    }

    /* 3️⃣ formato ISO FX */
    if (!/^[A-Z]{3}\/[A-Z]{3}$/.test(symbol)) {
      ctx.addIssue({
        path: ["symbol"],
        message: "Formato inválido (ej: EUR/USD)",
        code: z.ZodIssueCode.custom,
      });
    }

    /* 4️⃣ volumen coherente */
    if (minVolume.gt(maxVolume)) {
      ctx.addIssue({
        path: ["minVolume"],
        message: "minVolume no puede ser mayor que maxVolume",
        code: z.ZodIssueCode.custom,
      });
    }

    /* 5️⃣ precisión estándar CFD (máx 2 decimales) */
    if (minVolume.decimalPlaces() > 2) {
      ctx.addIssue({
        path: ["minVolume"],
        message: "minVolume no puede tener más de 2 decimales",
        code: z.ZodIssueCode.custom,
      });
    }

    if (maxVolume.decimalPlaces() > 2) {
      ctx.addIssue({
        path: ["maxVolume"],
        message: "maxVolume no puede tener más de 2 decimales",
        code: z.ZodIssueCode.custom,
      });
    }

    /* 6️⃣ pipSize vs spread */
    if (spread.lt(pipSize)) {
      ctx.addIssue({
        path: ["spread"],
        message: "spread no puede ser menor que pipSize",
        code: z.ZodIssueCode.custom,
      });
    }

    if (spread.gt(pipSize.mul(100))) {
      ctx.addIssue({
        path: ["spread"],
        message: "spread excesivamente alto para Forex CFD",
        code: z.ZodIssueCode.custom,
      });
    }

    /* 7️⃣ contractSize razonable (no cero, no subatómico) */
    if (contractSize.decimalPlaces() > 6) {
      ctx.addIssue({
        path: ["contractSize"],
        message: "contractSize tiene demasiada precisión",
        code: z.ZodIssueCode.custom,
      });
    }
  });

/* ──────────────────────────────────────────────────────────
 * Tipo inferido
 * ────────────────────────────────────────────────────────── */
export type InstrumentForexCFD = z.infer<typeof InstrumentForexCFDSchema>;
