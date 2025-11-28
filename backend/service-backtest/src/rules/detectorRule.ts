import { calculateRSI, Candle } from "@whiterockdev/common";
import { calculateEMA } from "../lib/ema/ema.js";
import { Backtester } from "../index.js";

export async function detectorRule(
  this: Backtester,
  RULE: number,
  candles: Candle[],
  currentCandle: Candle
): Promise<boolean> {

  if (!this.state.rule_values[RULE]) {
    const rsiData = calculateRSI(candles);
    const lastRsi = rsiData.at(-1)?.value;

    const ema55Data = calculateEMA(candles, 55);
    const lastEma55 = ema55Data.at(-1)?.value;

  
    if (typeof lastRsi !== "number" || Number.isNaN(lastRsi)) {
      throw new Error("lastRsi type error");
    }

    if (typeof lastEma55 !== "number" || Number.isNaN(lastEma55)) {
      throw new Error("EMA55 type error");
    }

    const rule1 = lastRsi < 33;

    const rule2 = lastEma55 > currentCandle.high; //The price did not touch the EMA

    this.state.rule_values[RULE] = rule1 && rule2;
  }

  return this.state.rule_values[RULE];
}
