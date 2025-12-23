import dotenv from "dotenv";
import { ERROR_EVENTS } from "./common/errors.js";
import { createJob1 } from "./jobs/job1.js";
import { validateEnv } from "./lib/env.js";
import { startRedis } from "./redis/redis.js";
import { startDailyWorker } from "./worker/daily-worker.js";
import { startDailyQueue } from "./queue/daily-queue.js";
import { logger } from "./common/logger.js";

dotenv.config({ path: ".env.local" });

const main = async () => {
  try {
    logger.info("🚀 Initializing service");

    const env = validateEnv();

    const redis = startRedis(env);

    const worker = startDailyWorker(redis);

    const queue = startDailyQueue(redis);

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
