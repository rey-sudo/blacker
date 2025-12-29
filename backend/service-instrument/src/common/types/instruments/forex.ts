import { z } from "zod";
import Decimal from "decimal.js";

/* ──────────────────────────────────────────────────────────
 * Decimal helper (producción)
 * - Normaliza a Decimal
 * - Evita NaN / Infinity
 * ────────────────────────────────────────────────────────── */
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

/* ──────────────────────────────────────────────────────────
 * InstrumentForexSchema
 * ────────────────────────────────────────────────────────── */
export const InstrumentForexSchema = z
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

    pipSize: DecimalSchema.refine((v) => v.gt(0), {
      message: "pipSize debe ser mayor que 0",
    }),

    minLot: DecimalSchema.refine((v) => v.gt(0), {
      message: "minLot debe ser mayor que 0",
    }),

    maxLot: DecimalSchema.refine((v) => v.gt(0), {
      message: "maxLot debe ser mayor que 0",
    }),

    leverage: z.number().int().min(1).max(1000),

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
      pipSize,
      minLot,
      maxLot,
      spread,
    } = data;

    /* ─────────────────────────────────────────────
     * 1️⃣ Monedas base / quote
     * ───────────────────────────────────────────── */

    if (baseCurrency === quoteCurrency) {
      ctx.addIssue({
        path: ["baseCurrency"],
        message: "baseCurrency y quoteCurrency no pueden ser iguales",
        code: z.ZodIssueCode.custom,
      });
      return;
    }

    /* JPY nunca puede ser base en Forex institucional */
    if (baseCurrency === "JPY") {
      ctx.addIssue({
        path: ["baseCurrency"],
        message: "JPY no puede ser baseCurrency en Forex estándar",
        code: z.ZodIssueCode.custom,
      });
      return;
    }

    /* ─────────────────────────────────────────────
     * 2️⃣ Validación final del símbolo
     * ───────────────────────────────────────────── */

    const symbolFormat = /^[A-Z]{3}\/[A-Z]{3}$/;

    if (!symbolFormat.test(symbol)) {
      ctx.addIssue({
        path: ["symbol"],
        message: "Formato inválido (ej: EUR/USD)",
        code: z.ZodIssueCode.custom,
      });
      return;
    }

    const expectedSymbol = `${baseCurrency}/${quoteCurrency}`;

    if (symbol !== expectedSymbol) {
      ctx.addIssue({
        path: ["symbol"],
        message: `symbol debe ser ${expectedSymbol}`,
        code: z.ZodIssueCode.custom,
      });
      return;
    }

    /* ─────────────────────────────────────────────
     * 3️⃣ pipSize real de mercado
     * ───────────────────────────────────────────── */

    const isJPYPair = quoteCurrency === "JPY";

    const expectedPipSize = isJPYPair
      ? new Decimal("0.01")
      : new Decimal("0.0001");

    if (!pipSize.equals(expectedPipSize)) {
      ctx.addIssue({
        path: ["pipSize"],
        message: `pipSize inválido. Esperado ${expectedPipSize.toString()}`,
        code: z.ZodIssueCode.custom,
      });
      return;
    }

    /* Defensa extra: precisión decimal exacta */
    if (pipSize.decimalPlaces() !== expectedPipSize.decimalPlaces()) {
      ctx.addIssue({
        path: ["pipSize"],
        message: "pipSize tiene precisión decimal inválida",
        code: z.ZodIssueCode.custom,
      });
      return;
    }

    /* ─────────────────────────────────────────────
     * 4️⃣ Lotes (posición institucional)
     * ───────────────────────────────────────────── */

    if (minLot.gt(maxLot)) {
      ctx.addIssue({
        path: ["minLot"],
        message: "minLot no puede ser mayor que maxLot",
        code: z.ZodIssueCode.custom,
      });
      return;
    }

    /* Lotes deben ser múltiplos exactos de 0.01 */
    const lotStep = new Decimal("0.01");

    if (!minLot.mod(lotStep).equals(0)) {
      ctx.addIssue({
        path: ["minLot"],
        message: "minLot debe ser múltiplo de 0.01",
        code: z.ZodIssueCode.custom,
      });
      return;
    }

    if (!maxLot.mod(lotStep).equals(0)) {
      ctx.addIssue({
        path: ["maxLot"],
        message: "maxLot debe ser múltiplo de 0.01",
        code: z.ZodIssueCode.custom,
      });
      return;
    }

    /* ─────────────────────────────────────────────
     * 5️⃣ Spread (ECN-safe)
     * ───────────────────────────────────────────── */

    if (spread.lte(0)) {
      ctx.addIssue({
        path: ["spread"],
        message: "spread debe ser mayor que 0",
        code: z.ZodIssueCode.custom,
      });
      return;
    }

    /* Spread máximo: 50 pips (defensivo, no arbitrario) */
    const maxSpread = expectedPipSize.mul(50);

    if (spread.gt(maxSpread)) {
      ctx.addIssue({
        path: ["spread"],
        message: "spread excede límites razonables para Forex",
        code: z.ZodIssueCode.custom,
      });
      return;
    }
  });

/* ──────────────────────────────────────────────────────────
 * Tipo inferido
 * ────────────────────────────────────────────────────────── */
export type InstrumentForex = z.infer<typeof InstrumentForexSchema>;
