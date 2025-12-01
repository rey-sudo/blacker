import { calculateEMA, calculateMFI, Candle } from "@whiterockdev/common";
import { SlaveBot } from "../index.js";

export async function mfiRule(
  this: SlaveBot,
  RULE: number,
  candles: Candle[]
): Promise<boolean> {
  if (!this.state.rule_values[RULE]) {
    const { haCandles, smaData } = calculateMFI(candles);

    const lastHeikin = haCandles.at(-1);
    const lastSma = smaData.at(-1);

    if (!lastHeikin) {
      throw new Error("lastHeikin  error");
    }

    if (!lastSma) {
      throw new Error("lastSma  error");
    }

    const EMA25 = calculateEMA(candles, 25);
    const { touches, failedBreakouts } = countEMATouches(candles, EMA25);

    const rule1 = lastHeikin.close < 70;
    const rule2 = lastHeikin.close > lastSma.value;
    const rule3 = touches >= 3 || failedBreakouts >= 4;

    this.state.rule_values[RULE] = rule1 && rule2;

    if (!rule1) {
      this.reset();
    }

    if (rule3) {
      console.log("⚠️⚠️⚠️⚠️⚠️EMA25 TOUCHES⚠️⚠️⚠️⚠️⚠️");
      this.reset();
    }
    
    await this.save();
  }

  return this.state.rule_values[RULE];
}

export function countEMATouches(
  data: Candle[],
  emaData: any,
  periodsToAnalyze: number = 5
) {
  // Basic length check
  if (data.length !== emaData.length) {
    console.error("Error: Price data and EMA data must have the same length.");
    return { touches: 0, failedBreakouts: 0 };
  }

  const len = data.length;
  if (len < 2) {
    // We need at least one previous candle to evaluate context
    return { touches: 0, failedBreakouts: 0 };
  }

  let touches = 0;
  let failedBreakouts = 0;

  const tolerancePercent = 0.0005;
  const start = Math.max(1, len - periodsToAnalyze);

  for (let i = start; i < len; i++) {
    const candle = data[i];
    const previousCandle = data[i - 1];

    // Validate candle shape and numeric fields
    const high = Number(candle?.high);
    const low = Number(candle?.low);
    const close = Number(candle?.close);
    const prevClose = Number(previousCandle?.close);

    if (
      !isFinite(high) ||
      !isFinite(low) ||
      !isFinite(close) ||
      !isFinite(prevClose)
    ) {
      // Skip bad data (could also log a counter)
      continue;
    }

    // --- Robust EMA extraction ---
    const emaItem = emaData[i];
    let ema: number;

    if (typeof emaItem === "number") {
      ema = emaItem;
    } else if (emaItem != null && typeof emaItem.value === "number") {
      ema = emaItem.value;
    } else if (emaItem != null && typeof emaItem === "object") {
      // try to coerce a common numeric field if exists
      const maybeNumber = Number(emaItem);
      ema = isFinite(maybeNumber) ? maybeNumber : NaN;
    } else {
      ema = NaN;
    }

    if (!isFinite(ema)) {
      // skip if EMA is not a valid number
      continue;
    }

    // --- Tolerance: avoid zero tolerance if ema === 0 ---
    // fallbackTolerance is based on candle size (if ema is 0 or too small)
    const candleRange = high - low;
    const baseTolerance = Math.abs(ema) * tolerancePercent;
    const fallbackTolerance = Math.max(candleRange * tolerancePercent, 1e-8);
    const toleranceAbs = Math.max(baseTolerance, fallbackTolerance);

    // Distances
    const distHigh = high - ema; // positive if wick above EMA
    const distLow = ema - low; // positive if wick below EMA

    // Touch detection (respecting side)
    const touchAbove = distHigh >= 0 && distHigh <= toleranceAbs;
    const touchBelow = distLow >= 0 && distLow <= toleranceAbs;

    // Context: previous close relative to EMA
    const isSupport = prevClose > ema; // price was above EMA → EMA acting like support
    const isResistance = prevClose < ema; // price was below EMA → EMA acting like resistance

    if ((touchAbove && isResistance) || (touchBelow && isSupport)) {
      touches++;
    }

    // Failed breakout detection (same logic but validated numerically)
    const breaksDownButClosesAbove = isSupport && low < ema && close > ema;
    const breaksUpButClosesBelow = isResistance && high > ema && close < ema;

    // Significant candle threshold (avoid micro-noise)
    const significantBreak = candleRange > toleranceAbs * 4;

    if (
      (breaksDownButClosesAbove || breaksUpButClosesBelow) &&
      significantBreak
    ) {
      failedBreakouts++;
    }
  }

  return { touches, failedBreakouts };
}
