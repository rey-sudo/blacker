import { calculateMFI, Candle } from "@whiterockdev/common";
import { addPercentage } from "../utils/applyDiscount.js";
import { calculateEMA } from "../lib/ema/ema.js";
import { Backtester } from "../index.js";

export async function R4_(
  this: Backtester,
  candles: Candle[],
  currentCandle: Candle
): Promise<boolean> {
  const RULE = 4;

  if (!this.state.rule_values[RULE]) {
    const { haCandles, smaData } = calculateMFI(candles);

    const EMA55 = calculateEMA(candles, 55).at(-1)?.value;
    if (typeof EMA55 !== "number" || Number.isNaN(EMA55)) {
      throw new Error("EMA55 type error");
    }

    const lastHeikin = haCandles.at(-1);
    const lastSma = smaData.at(-1);

    if (lastHeikin && lastSma) {
      const rule1 = lastHeikin.close < 50;
      const rule2 = lastHeikin.close > lastSma.value;
      const rule3 =
        EMA55 > addPercentage(currentCandle.close, 1);

      if (!rule1) {
        this.reset();
      }

      if (!rule3) {
        this.reset();
      }

      this.state.rule_values[RULE] = rule1 && rule2 && rule3;
    }
  }

  return this.state.rule_values[RULE];
}
