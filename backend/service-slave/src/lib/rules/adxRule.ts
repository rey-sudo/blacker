import { Candle, calculateADX } from "@whiterockdev/common";
import { SlaveBot } from "../../index.js";

export async function adxRule(
  this: SlaveBot,
  ruleIndex: number,
  candles: Candle[]
): Promise<boolean> {
  try {
    const ruleValue = this.state.rule_values[ruleIndex];

    if (ruleValue === true) return ruleValue;

    const keyLevel = 23;

    const { reversalPoints } = calculateADX(candles);

    const lastReversal = reversalPoints.at(-1);

    if (!lastReversal) {
      return false;
    }

    const range = [
      candles.at(-1)?.time,
      candles.at(-2)?.time,
      candles.at(-3)?.time,
    ];

    const rules = {
      0: range.includes(lastReversal.time),
      1: lastReversal.value > keyLevel,
    };

    const result = Object.values(rules).every(Boolean);

    if (result === true) {
      this.state.rule_values[ruleIndex] = result;

      await this.save();

      return result;
    }

    await this.sleep(300_000);

    return false;
  } catch (err: any) {
    return false;
  }
}
