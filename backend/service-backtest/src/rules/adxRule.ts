import { Candle } from "@whiterockdev/common";
import { Backtester } from "../index.js";
import { calculateADX } from "../lib/adx/adx.js";

export async function adxRule(
  this: Backtester,
  RULE: number,
  candles: Candle[],
): Promise<boolean> {

  if (!this.state.rule_values[RULE]) {
    const keyLevel = 23;

    const { reversalPoints } = calculateADX(candles);

    const lastReversal = reversalPoints.at(-1);

    if (lastReversal) {
      const range = [
        candles.at(-1)?.time,
        candles.at(-2)?.time,
        candles.at(-3)?.time,
      ];

      const rule1 = range.includes(lastReversal.time);

      const rule2 = lastReversal.value > keyLevel;

      this.state.rule_values[RULE] = rule1 && rule2;
    }
  }

  return this.state.rule_values[RULE];
}
