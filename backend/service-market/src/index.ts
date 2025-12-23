import * as route from "./routes/index.js";
import compression from "compression";
import dotenv from "dotenv";
import { ApiError, ERROR_EVENTS, errorHandler } from "@whiterockdev/common";
import { Request, Response } from "express";
import { app } from "./app.js";

dotenv.config({ path: ".env.development" });

const main = async () => {
  try {
    const requiredEnvVars = ["NODE_ENV"];

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

    app.get(
      "/api/market/get-candles",

      ...route.getCandlesMiddlewares,

      route.getCandlesHandler
    );

    app.get(
      "/api/market/get-candle",

      ...route.getCandleMiddlewares,

      route.getCandleHandler
    );

    app.get(
      "/api/market/get-footprint",

      ...route.getFootprintMiddlewares,

      route.getFootprintHandler
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
