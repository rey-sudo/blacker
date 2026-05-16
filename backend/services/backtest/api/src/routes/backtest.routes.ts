import { FastifyInstance } from "fastify";
import { backtestHandler } from "../handlers/backtest.handler.js";

export async function backtestRoutes(app: FastifyInstance) {
  app.get("/backtest", { websocket: true }, backtestHandler);
}
