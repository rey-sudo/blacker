import { Queue } from "bullmq";
import { logger } from "../common/logger.js";

export async function createJob1(queue: Queue) {
  await queue.add(
    "call-api",
    { source: "initial" },
    { removeOnComplete: true }
  );

  await queue.add(
    "call-api",
    { source: "cron" },
    {
      repeat: {
        every: 60_000, // 24 h
      },
      jobId: "call-api-repeat",
      attempts: 5,
      backoff: {
        type: "exponential",
        delay: 1000,
      },
      removeOnComplete: true,
      removeOnFail: false,
    }
  );

  logger.info("✅ Job1 Addded");
}
