import { z } from "zod";
import { CustomError } from "../common/customError";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "local"]),
  DATABASE_HOST: z.string().min(1),
  DATABASE_PORT: z
    .string()
    .refine((val) => !isNaN(Number(val)), {
      message: "DATABASE_PORT must be a number",
    })
    .transform(Number)
    .refine((val) => Number.isInteger(val) && val > 0, {
      message: "DATABASE_PORT must be a valid integer",
    }),
  DATABASE_USER: z.string().min(1),
  DATABASE_PASSWORD: z.string().min(1),
  DATABASE_NAME: z.string().min(1),
  REDIS_CACHE_HOST: z.string().min(1),
  PORT: z.string().min(1).transform(Number),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv() {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    throw new CustomError({
      message: "Error validating env variables",
      error: result.error.format(),
      event: "env.error",
      context: "validateEnv function",
    });
  }

  return result.data;
}
