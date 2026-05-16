import Fastify from "fastify";
import fastifyWebsocket from "@fastify/websocket";
import { backtestRoutes } from "./routes/backtest.routes.js";

export const app = Fastify({ logger: true });

await app.register(fastifyWebsocket);
await app.register(backtestRoutes);