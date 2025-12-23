import { Worker } from "bullmq";
import type Redis from "ioredis";
import { logger } from "../common/logger.js";

export function startDailyWorker(redis: Redis): Worker {
  logger.info("⚙️ Configuring dailyWorker");

  const worker = new Worker(
    "daily-job",
    async (job) => {
      console.log("🕒 Running daily job", job.id);

      const response = await fetch(
        "https://jsonplaceholder.typicode.com/todos/1"
      );

      if (!response.ok) {
        throw new Error("Fake API failed");
      }

      const data = await response.json();
      console.log("✅ API response:", data);
    },
    {
      connection: redis,
      concurrency: 1,
      limiter: {
        max: 1,
        duration: 60_000, 
      },
    }
  );

  worker.on("completed", (job) => {
    console.log(`✅ Job ${job.id} completed`);
  });

  worker.on("failed", (job, err) => {
    console.error(`❌ Job ${job?.id} failed`, err);
  });

  worker.on("error", (err) => {
    console.error("❌ Worker error", err);
  });

  return worker;
}
