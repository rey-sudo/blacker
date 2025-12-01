import { Candle, calculateADX } from "@whiterockdev/common";
import { SlaveBot } from "../index.js";

export async function adxRule(
  this: SlaveBot,
  RULE: number,
  candles: Candle[]
): Promise<boolean> {
  if (!this.state.rule_values[RULE]) {
    const keyLevel = 23;

    const { reversalPoints } = calculateADX(candles);

    const lastReversal = reversalPoints.at(-1);

    if (!lastReversal) {
      throw new Error("lastReversal error");
    }

    const range = [
      candles.at(-1)?.time,
      candles.at(-2)?.time,
      candles.at(-3)?.time,
    ];

    const rule1 = range.includes(lastReversal.time);

    const rule2 = lastReversal.value > keyLevel;

    this.state.rule_values[RULE] = rule1 && rule2;
    
    await this.save();
  }

  return this.state.rule_values[RULE];
}
