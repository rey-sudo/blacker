import { calculateADX, Candle } from "@whiterockdev/common";
import { Backtester } from "../index.js";

export async function R2_(
  this: Backtester,
  candles: Candle[],
  lastCandle: Candle
): Promise<boolean> {
  const RULE = 2;

  if (!this.state.rule_values[RULE]) {
    const keyLevel = 23;

    const { reversalPoints } = calculateADX(candles);

    const lastReversal = reversalPoints.at(-1);

    if (lastReversal) {
      const rule1 = lastReversal.time === lastCandle.time;

      const rule2 = lastReversal.value > keyLevel;

      this.state.rule_values[RULE] = rule1 && rule2;
    }
  }

  return this.state.rule_values[RULE];
}
