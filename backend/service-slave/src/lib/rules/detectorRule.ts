import {
  calculateRSI,
  Candle,
  calculateEMA,
  logger,
} from "@whiterockdev/common";
import { SlaveBot } from "../../index.js";

export async function detectorRule(
  this: SlaveBot,
  RULE: number,
  candles: Candle[]
): Promise<boolean> {
  if (!this.state.rule_values[RULE]) {
    const lastCandle = candles.at(-1);

    const rsiData = calculateRSI(candles);
    const lastRsi = rsiData.at(-1)?.value;

    const ema55Data = calculateEMA(candles, 55);
    const lastEma55 = ema55Data.at(-1)?.value;

    if (!lastCandle) {
      throw new Error("lastCandle  error");
    }

    if (typeof lastRsi !== "number" || Number.isNaN(lastRsi)) {
      throw new Error("lastRsi type error");
    }

    if (typeof lastEma55 !== "number" || Number.isNaN(lastEma55)) {
      throw new Error("lastEma55 type error");
    }

    logger.info(`RSI:${lastRsi}`);

    const rule1 = lastRsi <= 33;

    this.state.rule_values[RULE] = rule1;
  }

  return this.state.rule_values[RULE];
}
