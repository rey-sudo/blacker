import dotenv from "dotenv";
import { Request, Response } from "express";
import * as route from "./routes/index.js";
import { validateEnv } from "./config/env.js";
import { logger } from "./common/logger.js";
import { app } from "./app.js";
import {
  ApiError,
  ERROR_CODES,
  ERROR_EVENTS,
  errorHandler,
} from "./common/errors.js";

dotenv.config({ path: ".env.local" });

const main = async () => {
  try {
    const env = validateEnv();

    ERROR_EVENTS.forEach((event: string) => {
      process.on(event, (err) => {
        logger.error(err);
        process.exit(1);
      });
    });

    app.post(
      "/api/instrument/create-instrument",
      ...route.createInstrumentMiddlewares,
      route.createInstrumentHandler
    );

    app.get("/api/market/ping", (_req: Request, res: Response) => {
      res.status(200).json({ success: true, data: { message: "Test OK" } });
    });

    app.all("*", (req, _res, next) => {
      next(
        new ApiError(
          404,
          `Route not found: ${req.method} ${req.originalUrl}`,
          ERROR_CODES.ROUTE_NOT_FOUND
        )
      );
    });

    app.use(errorHandler);

    const port = env.PORT;

    app.listen(port, () => {
      logger.info(`🚀 Express server listening on port ${port}`);
    });
  } catch (err) {
    logger.error(err);
    process.exit(1);
  }
};

main();
