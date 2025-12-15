import { z } from "zod";

export const envSchema = z.object({
  SLAVE_NAME: z.string().min(1, "SLAVE_NAME es requerido"),
  MARKET: z.string().min(1, "MARKET es requerido"),
  SYMBOL: z.string().min(1, "SYMBOL es requerido"),
  INTERVAL: z.string().min(1, "INTERVAL es requerido"),
  SIDE: z.enum(["BUY", "SELL", "LONG", "SHORT"], {
    message: "SIDE debe ser BUY, SELL, LONG o SHORT",
  }),
  ACCOUNT_BALANCE: z
    .string()
    .transform((val) => {
      const num = parseInt(val, 10);
      if (isNaN(num))
        throw new Error("ACCOUNT_BALANCE debe ser un número entero");
      return num;
    })
    .pipe(z.number().positive("ACCOUNT_BALANCE debe ser positivo")),
  ACCOUNT_RISK: z
    .string()
    .transform((val) => {
      const num = parseFloat(val);
      if (isNaN(num)) throw new Error("ACCOUNT_RISK debe ser un número");
      return num;
    })
    .pipe(
      z
        .number()
        .positive("ACCOUNT_RISK debe ser positivo")
        .max(100, "ACCOUNT_RISK no puede ser mayor a 100")
    ),
  STOP_LOSS: z
    .string()
    .transform((val) => {
      const num = parseFloat(val);
      if (isNaN(num)) throw new Error("STOP_LOSS debe ser un número");
      return num;
    })
    .pipe(z.number().positive("STOP_LOSS debe ser positivo")),
  TAKE_PROFIT: z
    .string()
    .transform((val) => {
      const num = parseFloat(val);
      if (isNaN(num)) throw new Error("TAKE_PROFIT debe ser un número");
      return num;
    })
    .pipe(z.number().positive("TAKE_PROFIT debe ser positivo")),
  CONTRACT_SIZE: z
    .string()
    .transform((val) => {
      const num = parseInt(val, 10);
      if (isNaN(num))
        throw new Error("CONTRACT_SIZE debe ser un número entero");
      return num;
    })
    .pipe(z.number().positive("CONTRACT_SIZE debe ser positivo")),
  PRECISION: z
    .string()
    .transform((val) => {
      const num = parseInt(val, 10);
      if (isNaN(num)) throw new Error("PRECISION debe ser un número entero");
      return num;
    })
    .pipe(z.number().nonnegative("PRECISION no puede ser negativo")),
  SHOW_PLOTS: z
    .string()
    .transform((val) => val === "true")
    .pipe(z.boolean()),
  DESCRIPTION: z.string().min(1, "DESCRIPTION es requerido"),
  DATABASE_HOST: z.string().optional(),
  DATABASE_PORT: z
    .string()
    .transform((val) => {
      const num = parseInt(val, 10);
      if (isNaN(num))
        throw new Error("DATABASE_PORT debe ser un número entero");
      return num;
    })
    .pipe(
      z
        .number()
        .positive("DATABASE_PORT debe ser positivo")
        .max(65535, "DATABASE_PORT debe ser menor a 65536")
    ),
  DATABASE_USER: z.string(),
  DATABASE_PASSWORD: z.string(),
  DATABASE_NAME: z.string(),
});

export function validateEnv() {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    throw new Error(`❌ Error validating env vars: ${result.error.message}`);
  }

  return result.data;
}

export type Env = z.infer<typeof envSchema>;
