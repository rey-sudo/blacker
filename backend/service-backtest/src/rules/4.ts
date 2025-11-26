import { calculateMFI, Candle } from "@whiterockdev/common";
import { Backtester } from "../index.js";

export async function R4_(
  this: Backtester,
  candles: Candle[]
): Promise<boolean> {
  const RULE = 4;

  if (!this.state.rule_values[RULE]) {
    const { haCandles, smaData } = calculateMFI(candles);

    const lastHeikin = haCandles.at(-1);
    const lastSma = smaData.at(-1);

    if (lastHeikin && lastSma) {
      const rule1 = lastHeikin.close < 40; 
      const rule2 = lastHeikin.close > lastSma.value;

      this.state.rule_values[RULE] = rule1 && rule2;
    }
  }

  return this.state.rule_values[RULE];
}
