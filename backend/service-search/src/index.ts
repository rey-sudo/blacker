import dotenv from "dotenv";
import { ERROR_EVENTS } from "./common/errors.js";
import { createJob1 } from "./jobs/job1.js";
import { validateEnv } from "./lib/env.js";
import { startRedis } from "./redis/redis.js";
import { startDailyWorker } from "./worker/daily-worker.js";
import { startDailyQueue } from "./queue/daily-queue.js";
import { logger } from "./common/logger.js";
import Typesense from "typesense";
import {
  Instrument,
  startTypesense,
  upsertInstruments,
  verifyCollection,
} from "./typesense/index.js";

dotenv.config({ path: ".env.local" });

const main = async () => {
  try {
    logger.info("🚀 Initializing service");

    const env = validateEnv();

    const redis = startRedis(env);

    const worker = startDailyWorker(redis);

    const queue = startDailyQueue(redis);

    const typesense = startTypesense(env);

    const INSTRUMENTS_COLLECTION = "instruments";

    const instrumentsSchema = {
      name: INSTRUMENTS_COLLECTION,
      fields: [
        // Required primary key
        { name: "id", type: "string" },

        // Business identifiers
        { name: "internalId", type: "string", index: false },

        // Searchable fields
        { name: "symbol", type: "string" },
        { name: "description", type: "string", optional: true },

        // Filterable / faceted fields
        { name: "base", type: "string", facet: true },
        { name: "quote", type: "string", facet: true },
        { name: "exchange", type: "string", facet: true },
        { name: "market", type: "string", facet: true },
        { name: "type", type: "string", facet: true }, // spot | futures | other

        // Optional identifiers
        { name: "isin", type: "string", optional: true, index: false },
        { name: "cusip", type: "string", optional: true, index: false },
      ],
    };

    const tradingSymbols: Instrument[] = [
      {
        id: "binance-btc-usdt",
        internalId: "binance-btc-usdt",
        symbol: "BTCUSDT",
        description: "Bitcoin / Tether USD",
        base: "BTC",
        quote: "USDT",
        exchange: "Binance",
        market: "crypto",
        type: "spot",
      },
    ];

    await upsertInstruments(
      typesense,
      INSTRUMENTS_COLLECTION,
      instrumentsSchema,
      tradingSymbols
    );

    ERROR_EVENTS.forEach((event: string) =>
      process.on(event, async (err) => {
        console.error(err);
        await worker.close();
        process.exit(1);
      })
    );

    await createJob1(queue);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

main();
