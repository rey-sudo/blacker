import Fastify from "fastify";
import fastifyWebsocket from "@fastify/websocket";
import { RedisClientType } from "redis";
import { backtestRoutes } from "./routes/backtest.routes.js";
import { getRedisClient } from "./services/redis-client.js";

declare module "fastify" {
  interface FastifyInstance {
    redis: RedisClientType;
  }
}

const app = Fastify({ logger: true });

const redis = await getRedisClient();

app.decorate("redis", redis);

await app.register(fastifyWebsocket);
await app.register(backtestRoutes, {
  prefix: "/api/backtest",
});

app.addHook("onClose", async () => {
  await redis.quit();
});

export { app };
