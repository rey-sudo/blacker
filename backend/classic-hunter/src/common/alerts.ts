import { RedisClientType } from "redis";
import { v7 as uuidv7 } from "uuid";
import { logger } from "./logger.js";

interface Alert {
    id: string;
    message: string;
    timestamp: number;
}

const ALERTS_KEY = "alerts";

export async function createAlert(redisClient: RedisClientType<any, any, any>, message: string): Promise<number | null> {
    try {
        const alert: Alert = { id: uuidv7(), message, timestamp: Date.now() };
        const result = await redisClient.hSet(ALERTS_KEY, alert.id, JSON.stringify(alert));

        return result;
    } catch (err: any) {
        logger.error({
            service: process.env.SERVICE_NAME!,
            event: "alert:create",
            error: err.message,
            stack: err.stack
        });
        return null;
    }
}

export async function getAlerts(redisClient: RedisClientType<any, any, any>): Promise<Alert[]> {
    try {
        const raw = await redisClient.hGetAll(ALERTS_KEY);
        return Object.values(raw)
            .map((a) => JSON.parse(a) as Alert)
            .sort((a, b) => a.timestamp - b.timestamp);
    } catch (err: any) {
        logger.error({
            service: process.env.SERVICE_NAME!,
            event: "alert:get",
            error: err.message,
            stack: err.stack
        });
        return []
    }
}

export async function deleteAlert(redisClient: RedisClientType<any, any, any>, id: string): Promise<boolean> {
    try {
        const deleted = await redisClient.hDel(ALERTS_KEY, id);
        return deleted > 0;
    } catch (err: any) {
        logger.error({
            service: process.env.SERVICE_NAME!,
            event: "alert:delete",
            error: err.message,
            stack: err.stack
        });

        return false
    }
}
