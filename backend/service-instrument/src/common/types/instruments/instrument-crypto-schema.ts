import { z } from "zod";
import { DecimalSchema } from "./index.js";

/* ──────────────────────────────────────────────────────────
 * InstrumentCryptoSpotSchema
 * ────────────────────────────────────────────────────────── */
export const InstrumentCryptoSpotSchema = z
  .object({
    id: z.string().uuid(),

    symbol: z.string().transform((v) => v.toUpperCase()),

    baseAsset: z
      .string()
      .min(2)
      .max(10)
      .transform((v) => v.toUpperCase()),

    quoteAsset: z
      .string()
      .min(2)
      .max(10)
      .transform((v) => v.toUpperCase()),

    /* Crypto-specific */
    priceIncrement: DecimalSchema.refine((v) => v.gt(0), {
      message: "priceIncrement debe ser mayor que 0",
    }),

    quantityIncrement: DecimalSchema.refine((v) => v.gt(0), {
      message: "quantityIncrement debe ser mayor que 0",
    }),

    minQuantity: DecimalSchema.refine((v) => v.gt(0), {
      message: "minQuantity debe ser mayor que 0",
    }),

    maxQuantity: DecimalSchema.refine((v) => v.gt(0), {
      message: "maxQuantity debe ser mayor que 0",
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
      baseAsset,
      quoteAsset,
      priceIncrement,
      quantityIncrement,
      minQuantity,
      maxQuantity,
      spread,
    } = data;

    /* 1️⃣ base / quote distintos */
    if (baseAsset === quoteAsset) {
      ctx.addIssue({
        path: ["baseAsset"],
        message: "baseAsset y quoteAsset no pueden ser iguales",
        code: z.ZodIssueCode.custom,
      });
    }

    /* 2️⃣ symbol coherente */
    const expectedSymbol = `${baseAsset}/${quoteAsset}`;
    if (symbol !== expectedSymbol) {
      ctx.addIssue({
        path: ["symbol"],
        message: `symbol debe ser ${expectedSymbol}`,
        code: z.ZodIssueCode.custom,
      });
    }

    /* 3️⃣ formato estándar */
    if (!/^[A-Z0-9]{2,10}\/[A-Z0-9]{2,10}$/.test(symbol)) {
      ctx.addIssue({
        path: ["symbol"],
        message: "Formato inválido (ej: BTC/USDT)",
        code: z.ZodIssueCode.custom,
      });
    }

    /* 4️⃣ cantidades coherentes */
    if (minQuantity.gt(maxQuantity)) {
      ctx.addIssue({
        path: ["minQuantity"],
        message: "minQuantity no puede ser mayor que maxQuantity",
        code: z.ZodIssueCode.custom,
      });
    }

    /* 5️⃣ precisión coherente con incrementos */
    if (!minQuantity.mod(quantityIncrement).eq(0)) {
      ctx.addIssue({
        path: ["minQuantity"],
        message: "minQuantity debe ser múltiplo de quantityIncrement",
        code: z.ZodIssueCode.custom,
      });
    }

    if (!maxQuantity.mod(quantityIncrement).eq(0)) {
      ctx.addIssue({
        path: ["maxQuantity"],
        message: "maxQuantity debe ser múltiplo de quantityIncrement",
        code: z.ZodIssueCode.custom,
      });
    }

    /* 6️⃣ spread lógico */
    if (spread.gt(0) && spread.lt(priceIncrement)) {
      ctx.addIssue({
        path: ["spread"],
        message: "spread no puede ser menor que priceIncrement",
        code: z.ZodIssueCode.custom,
      });
    }

    if (spread.gt(priceIncrement.mul(1_000))) {
      ctx.addIssue({
        path: ["spread"],
        message: "spread excesivamente alto para un par crypto spot",
        code: z.ZodIssueCode.custom,
      });
    }
  });

/* ──────────────────────────────────────────────────────────
 * Tipo inferido
 * ────────────────────────────────────────────────────────── */
export type InstrumentCryptoSpot = z.infer<typeof InstrumentCryptoSpotSchema>;
