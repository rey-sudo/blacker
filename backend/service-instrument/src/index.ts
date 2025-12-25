import * as route from "./routes/index.js";
import compression from "compression";
import dotenv from "dotenv";
import { database } from "./database/index.js";
import { Request, Response } from "express";
import { ApiError, ERROR_EVENTS, errorHandler } from "./common/errors.js";
import { app } from "./app.js";

dotenv.config({ path: ".env.development" });

const main = async () => {
  try {
    const requiredEnvVars = [
      "NODE_ENV",
      "DATABASE_HOST",
      "DATABASE_PORT",
      "DATABASE_USER",
      "DATABASE_PASSWORD",
      "DATABASE_NAME",
      "REDIS_CACHE_HOST",
    ];

    for (const varName of requiredEnvVars) {
      if (!process.env[varName]) {
        throw new Error(`${varName} error`);
      }
    }

    ERROR_EVENTS.forEach((e: string) =>
      process.on(e, (err) => {
        console.error(err);
        process.exit(1);
      })
    );

    const databasePort = parseInt(process.env.DATABASE_PORT!);

    database.connect({
      host: process.env.DATABASE_HOST,
      port: databasePort,
      user: process.env.DATABASE_USER,
      password: process.env.DATABASE_PASSWORD,
      database: process.env.DATABASE_NAME,
    });

    app.post(
      "/api/user/login-user",

      ...route.loginUserMiddlewares,

      route.loginUserHandler
    );

    app.get("/api/market/ping", (req: Request, res: Response) => {
      res.status(200).json({ success: true, data: { message: "Test OK" } });
    });

    app.all("*", (req, _res, next) => {
      next(
        new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`, {
          code: "ROUTE_NOT_FOUND",
        })
      );
    });

    app.use(errorHandler);

    app.use(compression());

    app.listen(8001, () => console.log(`express server listening in 8001`));
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

main();
