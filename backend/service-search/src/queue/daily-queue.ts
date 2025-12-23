import { Queue } from "bullmq";
import type Redis from "ioredis";

let dailyQueue: Queue | null = null;


export function startDailyQueue(redis: Redis): Queue {
  if (dailyQueue) {
    return dailyQueue;
  }

  dailyQueue = new Queue("daily-job", {
    connection: redis,
  });

  return dailyQueue;
}
