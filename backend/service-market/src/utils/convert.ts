import { Candle } from "../types/index.js";

export function convertMsToSeconds(data: Candle[]) {
  if (!Array.isArray(data)) return [];

  return data.map(item => ({
    ...item,
    time: typeof item.time === "number" ? Math.floor(item.time / 1000) : null,
  }));
}
