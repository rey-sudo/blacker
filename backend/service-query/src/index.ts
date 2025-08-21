import express, { Request, Response, NextFunction } from 'express';
import morgan from 'morgan';
import helmet from 'helmet';
import axios from 'axios';
import dotenv from 'dotenv';
import retry from 'async-retry';
import database from './database/client.js';
import { ERROR_EVENTS } from './utils/errors.js';
import { USDMClient } from 'binance';

dotenv.config();

async function main() {
  const REQUIRED_ENV_VARS = [
    "NODE_ENV",
    "DATABASE_HOST",
    "DATABASE_PORT",
    "DATABASE_USER",
    "DATABASE_PASSWORD",
    "DATABASE_NAME",
    "BINANCE_KEY",
    "BINANCE_SECRET",
    "SLAVE_HOST",
    "HUNTER_HOST"
  ] as const;

  for (const varName of REQUIRED_ENV_VARS) {
    if (!process.env[varName]) {
      console.error(`❌ Missing required environment variable: ${varName}`);
      process.exit(1);
    }
  }

  for (const event of ERROR_EVENTS) {
    process.on(event, (err) => {
      console.error(`❌ Process error [${event}]:`, err);
      process.exit(1);
    });
  }

  const SLAVE_PORT = process.env.SLAVE_PORT!;

  const EXPRESS_PORT = 8000

  await database.connect({
    host: process.env.DATABASE_HOST!,
    port: parseInt(process.env.DATABASE_PORT!, 10),
    user: process.env.DATABASE_USER!,
    password: process.env.DATABASE_PASSWORD!,
    database: process.env.DATABASE_NAME!
  });

  const binance = new USDMClient({
    api_key: process.env.BINANCE_KEY!,
    api_secret: process.env.BINANCE_SECRET!
  });

  const app = express();

  app.disable("x-powered-by");

  app.use(helmet({
    contentSecurityPolicy: process.env.NODE_ENV === "production" ? undefined : false,
  }));

  /** 
  app.use(cors({
    origin: process.env.NODE_ENV === "production" ? ["https://tu-dominio.com"] : "*",
    methods: ["GET", "POST"],
  }));
 */
  app.use(express.json());

  app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

  axios.defaults.timeout = 5000;

  app.get("/api/query/get-slaves", async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const scheme = [
        {
          "id": "slave-0",
          "symbol": "BTCUSDT",
          "description":
            "Trading bot that combines RSI, Squeeze, ADX and Heikin-Ashi to detect bullish trends, buy and sell with stop loss.",
          "enabled": true,
          "live": true,
          "iteration": 53,
          "info": [
            { "title": "Runtime", "subtitle": "3d 8h 55m" },
            { "title": "Status", "subtitle": "Running" },
            { "title": "Rules", "subtitle": "3/4" },
            { "title": "Executed", "subtitle": "True" },
            { "title": "Finished", "subtitle": "False" },
            { "title": "Leverage", "subtitle": "5x" },
            { "title": "SL", "subtitle": "3%" },
            { "title": "Amount", "subtitle": "500 USD" },
            { "title": "Margin", "subtitle": "ISOLATED" }
          ],
          "images": [
            "https://picsum.photos/id/237/400/600",
            "https://picsum.photos/id/238/400/600",
            "https://picsum.photos/id/239/400/600"
          ]
        }
      ]

      res.json({ success: true, message: 'ok', data: scheme });
    } catch (error) {
      next(error);
    }
  });

  app.get("/health", async (_req: Request, res: Response) => {
    try {

      res.json({ message: "ok", data: null });
    } catch (error) {
      res.status(500).json({ status: "error", error: "DB connection failed" });
    }
  });

  app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: "Not Found" });
  });

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    console.error("❌ Internal server error:", err);
    res.status(500).json({ error: "Internal server error" });
  });

  app.listen(EXPRESS_PORT, () => {
    console.log(`✅ Slave server running on port ${SLAVE_PORT} [${process.env.NODE_ENV}]`);
  });
}

main();
