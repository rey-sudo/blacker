import { calculateRSI, Candle } from "@whiterockdev/common";
import { Backtester } from "../index.js";

export async function R0_(
  this: Backtester,
  candles: Candle[]
): Promise<boolean> {
  const RULE = 0;

  if (!this.state.rule_values[RULE]) {
    const lastRsi = calculateRSI(candles).at(-1)?.value;

    if (typeof lastRsi !== "number" || Number.isNaN(lastRsi)) {
      throw new Error("lastRsi type error");
    }

    const rule1 = lastRsi < 33;

    this.state.rule_values[RULE] = rule1;
  }

  return this.state.rule_values[RULE];
}
