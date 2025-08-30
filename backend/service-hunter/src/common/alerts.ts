import { RedisClientType } from "redis";
import { v7 as uuidv7 } from "uuid";
import { logger } from "./logger.js";

export async function createAlert(redisClient: RedisClientType, message: string): Promise<number | null> {
    try {
        const scheme = { id: uuidv7(), message, timestamp: Date.now() };

        const result = await redisClient.lPush("alerts", JSON.stringify(scheme));

        return result
 
    } catch (err) {
        logger.error({ 
            service: process.env.SERVICE_NAME,
            event: "create:alert",
            error: err
        })
        return null
    }
}


export async function getAlerts(redisClient: RedisClientType) {
  const raw = await redisClient.lRange("alerts", 0, -1);
  return raw.map((a) => JSON.parse(a));
}


export async function deleteAlert(redisClient: RedisClientType, id: string) {
  const alerts = await getAlerts(redisClient);
  const item = alerts.find((a) => a.id === id);
  if (item) {
    await redisClient.lRem("alerts", 1, JSON.stringify(item));
  }
}