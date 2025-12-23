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

  TYPESENSE_HOST: z.string().min(1, "TYPESENSE_HOST is required"),

  TYPESENSE_PORT: z
    .string()
    .transform(Number)
    .refine(
      (port) => Number.isInteger(port) && port > 0 && port <= 65535,
      "TYPESENSE_PORT must be a valid port number"
    ),

  TYPESENSE_PROTOCOL: z.enum(["http", "https"]),

  TYPESENSE_API_KEY: z.string().min(1, "TYPESENSE_API_KEY is required"),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(): Env {
  logger.info("📁 Parsing env variables");

  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const formatted = result.error.format();

    throw new Error(
      `❌ Invalid environment variables:\n${JSON.stringify(formatted, null, 2)}`
    );
  }

  return result.data;
}
