import express, { NextFunction, Request, Response } from 'express';
import morgan from 'morgan';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { redisClient, database } from './database/client.js';
import { deleteAlertHandler } from './routes/delete-alert.js';
import { getSlavesHandler } from './routes/get-slaves.js';
import { getAlertsHandler } from './routes/get-alerts.js';
import { healthHandler } from './routes/health.js';
import { ERROR_EVENTS } from './utils/errors.js';
import { USDMClient } from 'binance';


dotenv.config();

async function main() {
  const REQUIRED_ENV_VARS = [
    "NODE_ENV",
    "SERVICE_NAME",
    "DATABASE_HOST",
    "DATABASE_PORT",
    "DATABASE_USER",
    "DATABASE_PASSWORD",
    "DATABASE_NAME",
    "BINANCE_KEY",
    "BINANCE_SECRET",
    "SLAVE_HOST",
    "HUNTER_HOST",
    "REDIS_HOST"
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

  const EXPRESS_PORT = 3000

  await database.connect({
    host: process.env.DATABASE_HOST!,
    port: parseInt(process.env.DATABASE_PORT!, 10),
    user: process.env.DATABASE_USER!,
    password: process.env.DATABASE_PASSWORD!,
    database: process.env.DATABASE_NAME!
  });

  await redisClient.connect({
    url: process.env.REDIS_HOST!,
    socket: {
      connectTimeout: 100000,
      keepAlive: 100000,
    } as any,
    service: "service-query",
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

  app.use(express.json());

  app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

  app.get("/api/query/get-slaves", getSlavesHandler);

  app.get("/api/query/get-alerts", getAlertsHandler);

  app.delete("/api/query/delete-alert/:id", deleteAlertHandler);

  app.get("/api/query/health", healthHandler);

  app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: "Not Found" });
  });

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    console.error("❌ Internal server error:", err);
    res.status(500).json({ error: "Internal server error" });
  });

  app.listen(EXPRESS_PORT, () => {
    console.log(`✅ Slave server running on port ${EXPRESS_PORT}`);
  });
}

main();
