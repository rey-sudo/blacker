import { z } from "zod";
import Decimal from "decimal.js";
import { DecimalSchema } from "./index.js";


const CurrencyCodeSchema = z
  .string()
  .regex(/^[A-Z]{3}$/, "Código de moneda inválido (ISO 4217)");

/* =========
 * Schema
 * ========= */

export const InstrumentForexSpotSchema = z
  .object({
    symbol: z.string(),

    baseCurrency: CurrencyCodeSchema,
    quoteCurrency: CurrencyCodeSchema,

    pipSize: DecimalSchema,
    minLot: DecimalSchema,
    maxLot: DecimalSchema,
    spread: DecimalSchema,
  })

  /* =========
   * Validaciones institucionales
   * ========= */
  .superRefine((data, ctx) => {
    const {
      symbol,
      baseCurrency,
      quoteCurrency,
      pipSize,
      minLot,
      maxLot,
      spread,
    } = data;

    /* 1️⃣ base ≠ quote */
    if (baseCurrency === quoteCurrency) {
      ctx.addIssue({
        path: ["baseCurrency"],
        message: "baseCurrency y quoteCurrency no pueden ser iguales",
        code: z.ZodIssueCode.custom,
      });
      return;
    }

    /* 2️⃣ JPY solo como quote (regla FX spot estándar) */
    if (baseCurrency === "JPY") {
      ctx.addIssue({
        path: ["baseCurrency"],
        message: "JPY no puede ser moneda base en Forex Spot",
        code: z.ZodIssueCode.custom,
      });
      return;
    }

    /* 3️⃣ symbol coherente */
    const expectedSymbol = `${baseCurrency}/${quoteCurrency}`;

    if (symbol !== expectedSymbol) {
      ctx.addIssue({
        path: ["symbol"],
        message: `symbol debe ser ${expectedSymbol}`,
        code: z.ZodIssueCode.custom,
      });
      return;
    }

    if (!/^[A-Z]{3}\/[A-Z]{3}$/.test(symbol)) {
      ctx.addIssue({
        path: ["symbol"],
        message: "Formato inválido (ej: EUR/USD)",
        code: z.ZodIssueCode.custom,
      });
      return;
    }

    /* 4️⃣ pipSize real según JPY */
    const hasJPY = quoteCurrency === "JPY";
    const expectedPip = hasJPY
      ? new Decimal("0.01")
      : new Decimal("0.0001");

    if (!pipSize.equals(expectedPip)) {
      ctx.addIssue({
        path: ["pipSize"],
        message: `pipSize inválido. Esperado ${expectedPip.toString()}`,
        code: z.ZodIssueCode.custom,
      });
      return;
    }

    /* 5️⃣ lotes positivos y coherentes */
    if (minLot.lte(0)) {
      ctx.addIssue({
        path: ["minLot"],
        message: "minLot debe ser mayor que 0",
        code: z.ZodIssueCode.custom,
      });
      return;
    }

    if (maxLot.lte(0)) {
      ctx.addIssue({
        path: ["maxLot"],
        message: "maxLot debe ser mayor que 0",
        code: z.ZodIssueCode.custom,
      });
      return;
    }

    if (minLot.gt(maxLot)) {
      ctx.addIssue({
        path: ["minLot"],
        message: "minLot no puede ser mayor que maxLot",
        code: z.ZodIssueCode.custom,
      });
      return;
    }

    /* 6️⃣ precisión estándar de lotes (máx 2 decimales, exactos) */
    if (minLot.decimalPlaces() > 2) {
      ctx.addIssue({
        path: ["minLot"],
        message: "minLot no puede tener más de 2 decimales",
        code: z.ZodIssueCode.custom,
      });
      return;
    }

    if (maxLot.decimalPlaces() > 2) {
      ctx.addIssue({
        path: ["maxLot"],
        message: "maxLot no puede tener más de 2 decimales",
        code: z.ZodIssueCode.custom,
      });
      return;
    }

    /* 7️⃣ spread lógico */
    if (spread.lt(0)) {
      ctx.addIssue({
        path: ["spread"],
        message: "spread no puede ser negativo",
        code: z.ZodIssueCode.custom,
      });
      return;
    }

    if (spread.lt(pipSize)) {
      ctx.addIssue({
        path: ["spread"],
        message: "spread no puede ser menor que pipSize",
        code: z.ZodIssueCode.custom,
      });
      return;
    }

    if (spread.gt(pipSize.mul(50))) {
      ctx.addIssue({
        path: ["spread"],
        message: "spread excesivamente alto para Forex Spot",
        code: z.ZodIssueCode.custom,
      });
      return;
    }
  });

/* =========
 * Type
 * ========= */

export type InstrumentForexSpot = z.infer<
  typeof InstrumentForexSpotSchema
>;
