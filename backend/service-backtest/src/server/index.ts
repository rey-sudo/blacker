import morgan from "morgan";
import helmet from "helmet";
import express from "express";
import { Backtester, root } from "../index.js";
import { logger } from "../utils/logger.js";
import { getLogsHandler } from "../routes/get-logs.js";

export function startHttpServer(bot: Backtester) {
  const app = express();

  app.disable("x-powered-by");

  app.use(
    helmet({
      contentSecurityPolicy:
        process.env.NODE_ENV === "production" ? undefined : false,
    })
  );

  app.use(express.json());

  app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

  app.get(`/api/market/get-candles`, (req, res) => {
    res.json({ success: true, data: bot.state.current_window });
  });

  app.get(`/api/market/get-candle`, (req, res) => {
    res.json({ success: true, data: bot.state.current_window.at(-1) });
  });

  app.get(`/api/backtest/get-logs`, getLogsHandler);

  app.get(`/api/backtest/health`, (req, res) => {
    res.status(200).json({
      success: true,
      message: "test OK",
    });
  });

  app.use((req, res) => {
    res.status(404).send("Not Found");
  });

  app.listen(8001, () => {
    logger.info("📡 Server listening port 8001");
  });
}
