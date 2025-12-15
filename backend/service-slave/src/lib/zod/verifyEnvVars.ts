import { z } from "zod";

export const envSchema = z.object({
  SLAVE_NAME: z.string().min(1, "SLAVE_NAME is required"),
  MARKET: z.string().min(1, "MARKET is required"),
  SYMBOL: z.string().min(1, "SYMBOL is required"),
  INTERVAL: z.string().min(1, "INTERVAL is required"),
  SIDE: z.enum(["BUY", "SELL", "LONG", "SHORT"], {
    message: "SIDE must be BUY, SELL, LONG, or SHORT",
  }),
  ACCOUNT_BALANCE: z
    .string()
    .transform((val) => {
      const num = parseInt(val, 10);
      if (isNaN(num))
        throw new Error("ACCOUNT_BALANCE must be an integer number");
      return num;
    })
    .pipe(z.number().positive("ACCOUNT_BALANCE must be positive")),
  ACCOUNT_RISK: z
    .string()
    .transform((val) => {
      const num = parseFloat(val);
      if (isNaN(num)) throw new Error("ACCOUNT_RISK must be a number");
      return num;
    })
    .pipe(
      z
        .number()
        .positive("ACCOUNT_RISK must be positive")
        .max(100, "ACCOUNT_RISK cannot be greater than 100")
    ),
  STOP_LOSS: z
    .string()
    .transform((val) => {
      const num = parseFloat(val);
      if (isNaN(num)) throw new Error("STOP_LOSS must be a number");
      return num;
    })
    .pipe(z.number().positive("STOP_LOSS must be positive")),
  TAKE_PROFIT: z
    .string()
    .transform((val) => {
      const num = parseFloat(val);
      if (isNaN(num)) throw new Error("TAKE_PROFIT must be a number");
      return num;
    })
    .pipe(z.number().positive("TAKE_PROFIT must be positive")),
  CONTRACT_SIZE: z
    .string()
    .transform((val) => {
      const num = parseInt(val, 10);
      if (isNaN(num))
        throw new Error("CONTRACT_SIZE must be an integer number");
      return num;
    })
    .pipe(z.number().positive("CONTRACT_SIZE must be positive")),
  PRECISION: z
    .string()
    .transform((val) => {
      const num = parseInt(val, 10);
      if (isNaN(num)) throw new Error("PRECISION must be an integer number");
      return num;
    })
    .pipe(z.number().nonnegative("PRECISION cannot be negative")),
  SHOW_PLOTS: z
    .string()
    .transform((val) => val === "true")
    .pipe(z.boolean()),
  DESCRIPTION: z.string().min(1, "DESCRIPTION is required"),
  DATABASE_HOST: z.string().optional(),
  DATABASE_PORT: z
    .string()
    .transform((val) => {
      const num = parseInt(val, 10);
      if (isNaN(num))
        throw new Error("DATABASE_PORT must be an integer number");
      return num;
    })
    .pipe(
      z
        .number()
        .positive("DATABASE_PORT must be positive")
        .max(65535, "DATABASE_PORT must be less than 65536")
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
