import { z } from "zod";
import { logger } from "../common/logger.js";

export const envSchema = z.object({
  NODE_ENV: z
    .enum(["local", "development", "production"])
    .default("development"),

  REDIS_HOST: z.string().min(1, "REDIS_HOST is required"),

  REDIS_PORT: z
    .string()
    .regex(/^\d+$/, "REDIS_PORT must be a number")
    .transform(Number)
    .default("6379"),

  REDIS_USERNAME: z.string().optional(),

  REDIS_PASSWORD: z.string().optional(),

  REDIS_DB: z
    .string()
    .regex(/^\d+$/, "REDIS_DB must be a number")
    .transform(Number)
    .default("0"),

  REDIS_TLS: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(): Env {
  logger.info("📁 Parsing env variables")

  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const formatted = result.error.format();

    throw new Error(
      `❌ Invalid environment variables:\n${JSON.stringify(formatted, null, 2)}`
    );
  }

  return result.data;
}

