import { createClient, type RedisClientType } from "redis";

let client: RedisClientType | null = null;

export async function getRedisClient(): Promise<RedisClientType> {
  if (client?.isOpen) {
    return client;
  }

  client = createClient({
    url: process.env.REDIS_URL ?? "redis://redis-local:6379",
  });

  client.on("error", (err) => {
    console.error("Redis error:", err);
  });

  client.on("connect", () => {
    console.log("Redis connecting...");
  });

  client.on("ready", () => {
    console.log("Redis ready");
  });
  
  client.on("reconnecting", () => {
    console.log("Redis reconnecting...");
  });

  await client.connect();

  return client;
}
