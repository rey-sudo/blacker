import { Candle } from "@whiterockdev/common";
import { Backtester } from "../index.js";
import { calculateHeikenAshiCustom } from "../lib/heikin/heikin.js";

export async function R3_(
  this: Backtester,
  candles: Candle[]
): Promise<boolean> {
  const RULE = 3

  if (!this.state.rule_values[RULE]) {
    const renko = calculateHeikenAshiCustom(candles, 1).at(-1)?.color;

    if (renko) {
      const rule1 = renko === "green";
      this.state.rule_values[RULE] = rule1;
    }
  }

  return this.state.rule_values[RULE];
}
