import { calculateMFI, Candle, TimeValue } from "@whiterockdev/common";
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

    const EMA25 = calculateEMA(candles, 25);

    const lastHeikin = haCandles.at(-1);
    const lastSma = smaData.at(-1);

    if (lastHeikin && lastSma) {
      const rule1 = lastHeikin.close < 90;
      const rule2 = lastHeikin.close > lastSma.value;
      const rule3 = EMA55 > addPercentage(currentCandle.close, 1);

      const { touchCount, totalTouches } = countEMATouches(candles, EMA25, 5);

      const rule4 = touchCount >= 2 || totalTouches >= 2;

      this.state.rule_values[RULE] = rule1 && rule2 && rule3;

      if (!rule1) {
        this.reset();
      }

      if (!rule3) {
        this.reset();
      }

      if (rule4) {
        console.log("⚠️⚠️⚠️⚠️⚠️EMA25 TOUCHES⚠️⚠️⚠️⚠️⚠️");
        this.reset();
      }
    }
  }

  return this.state.rule_values[RULE];
}

export function countEMATouches(candles: Candle[], ema: any, periods = 4) {
  const realTolerance = 0.0015; // 0.15%
  const nearTolerance = 0.003; // 0.30%

  let touchCount = 0; 
  let nearTouchCount = 0; 

  for (let i = 1; i <= periods; i++) {
    const candle = candles.at(-i);
    const emaPoint = ema.at(-i);

    if (!candle || !emaPoint || emaPoint.value === null) continue;

    const high = candle.high;
    const emaValue = emaPoint.value;
    const diff = high - emaValue;

    if (i === 1) {
      if (high >= emaValue) {
        touchCount++;
      }
      continue; 
    }

    if (diff >= 0 && diff <= emaValue * realTolerance) {
      touchCount++;
      continue;
    }

    if (diff < 0 && Math.abs(diff) <= emaValue * nearTolerance) {
      nearTouchCount++;
      continue;
    }
  }

  return {
    touchCount,
    nearTouchCount,
    totalTouches: touchCount + nearTouchCount,
  };
}
