import Redis from "ioredis";
import type { Env } from "../lib/env.js";
import { logger } from "../common/logger.js";

let redis: Redis | null = null;

export function startRedis(env: Env): Redis {
  if (redis) {
    return redis;
  }

  redis = new Redis({
    host: env.REDIS_HOST,
    port: env.REDIS_PORT,
    username: env.REDIS_USERNAME,
    password: env.REDIS_PASSWORD,
    db: env.REDIS_DB,
    tls: env.REDIS_TLS ? {} : undefined,
    maxRetriesPerRequest: null,
  });

  redis.on("connect", () => {
    logger.info("✅ Redis connected");
  });

  redis.on("error", (err) => {
    logger.error(`❌ Redis error ${err}`);
  });

  redis.on("close", () => {
    logger.warn("⚠️ Redis connection closed");
  });

  return redis;
}
