import { calculateRSI, Candle } from "@whiterockdev/common";
import { Backtester } from "../index.js";
import { calculateEMA } from "../lib/ema/ema.js";
import { addPercentage, applyDiscount } from "../utils/applyDiscount.js";

export async function R0_(
  this: Backtester,
  candles: Candle[],
  currentCandle: Candle
): Promise<boolean> {
  const RULE = 0;

  if (!this.state.rule_values[RULE]) {
    const lastRsi = calculateRSI(candles).at(-1)?.value;

    const EMA55 = calculateEMA(candles, 55).at(-1)?.value;

    if (typeof lastRsi !== "number" || Number.isNaN(lastRsi)) {
      throw new Error("lastRsi type error");
    }

    if (typeof EMA55 !== "number" || Number.isNaN(EMA55)) {
      throw new Error("EMA55 type error");
    }

    const rule1 = lastRsi < 33;

    const rule2 = EMA55 > currentCandle.high; //The price did not touch the EMA

    this.state.rule_values[RULE] = rule1 && rule2 

    if (this.state.rule_values[RULE]) {
      console.log("🚨 UNDER EMA5");
    }
  }

  return this.state.rule_values[RULE];
}
