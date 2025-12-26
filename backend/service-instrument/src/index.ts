/*
 * BLACKER
 * Copyright (C) 2024  Juan José Caballero Rey
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */



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
          ERROR_CODES.ROUTE_NOT_FOUND.http,
          `Route not found: ${req.method} ${req.originalUrl}`,
          ERROR_CODES.ROUTE_NOT_FOUND.code
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
