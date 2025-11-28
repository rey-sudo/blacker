import { Candle } from "../../types/index.js";

const BB_LENGTH = 20;
const KC_LENGTH = 20;
const KC_MULT = 1.5;
const USE_TR = true;

function sma(values: any, length: any) {
  if (values.length < length) return null;
  let sum = 0;
  for (let i = values.length - length; i < values.length; i++) {
    sum += values[i];
  }
  return sum / length;
}

function stdev(values: any, length: any) {
  if (values.length < length) return null;
  const mean: any = sma(values, length);
  let total = 0;
  for (let i = values.length - length; i < values.length; i++) {
    const d = values[i] - mean;
    total += d * d;
  }
  return Math.sqrt(total / length);
}

function highest(arr: any, length: any) {
  return arr.length >= length
    ? Math.max(...arr.slice(arr.length - length))
    : null;
}

function lowest(arr: any, length: any) {
  return arr.length >= length
    ? Math.min(...arr.slice(arr.length - length))
    : null;
}

function linreg(values: any, length: any, offset = 0) {
  if (values.length < length) return null;

  let xSum = 0;
  let ySum = 0;
  let xySum = 0;
  let xxSum = 0;

  const start = values.length - length;
  const end = values.length - 1;

  for (let i = 0; i < length; i++) {
    const x = i;
    const y = values[start + i];
    xSum += x;
    ySum += y;
    xySum += x * y;
    xxSum += x * x;
  }

  const slope = (length * xySum - xSum * ySum) / (length * xxSum - xSum * xSum);

  const intercept = (ySum - slope * xSum) / length;

  // TradingView forecast: x = length-1 + offset
  const x = length - 1 + offset;
  return slope * x + intercept;
}

function trueRange(candle: Candle, prev: any) {
  if (!prev) return candle.high - candle.low;
  return Math.max(
    candle.high - candle.low,
    Math.abs(candle.high - prev.close),
    Math.abs(candle.low - prev.close)
  );
}

function computeSQZMOM(candles: Candle[]) {
  const close = candles.map((c) => c.close);
  const high = candles.map((c) => c.high);
  const low = candles.map((c) => c.low);

  const tr = candles.map((c, i) => trueRange(c, i > 0 ? candles[i - 1] : null));

  const output = [];
  let oscHistory = [];

  for (let i = 0; i < candles.length; i++) {
    const sliceClose = close.slice(0, i + 1);

    // ---- Bollinger Bands ----
    const basis = sma(sliceClose, BB_LENGTH);
    const dev: any = stdev(sliceClose, BB_LENGTH);

    // ⚠ LazyBear BUG: usa multKC en lugar de multBB
    const upperBB: any = basis !== null ? basis + dev * KC_MULT : null;
    const lowerBB: any = basis !== null ? basis - dev * KC_MULT : null;

    // ---- Keltner Channels ----
    const maKC = sma(sliceClose, KC_LENGTH);
    const rangeMa: any = sma(tr.slice(0, i + 1), KC_LENGTH);

    const upperKC: any = maKC !== null ? maKC + rangeMa * KC_MULT : null;
    const lowerKC: any = maKC !== null ? maKC - rangeMa * KC_MULT : null;

    if (basis === null || maKC === null) {
      output.push({
        time: candles[i].time,
        value: 0,
        squeeze: "none",
      });
      continue;
    }

    // ---- Squeeze conditions ----
    const sqzOn = lowerBB > lowerKC && upperBB < upperKC;
    const sqzOff = lowerBB < lowerKC && upperBB > upperKC;

    const sqzNone = !sqzOn && !sqzOff;

    // ---- Oscillator ----
    const hi: any = highest(high.slice(0, i + 1), KC_LENGTH);
    const lo: any = lowest(low.slice(0, i + 1), KC_LENGTH);
    const midSMA: any = sma(sliceClose, KC_LENGTH);

    const mid = ((hi + lo) / 2 + midSMA) / 2;
    const osc = close[i] - mid;

    oscHistory.push(osc);

    const momentumValue = linreg(oscHistory, KC_LENGTH, 0) ?? 0;

    output.push({
      time: candles[i].time,
      value: momentumValue,
      squeeze: sqzOn ? "on" : sqzOff ? "off" : "none",
    });
  }

  return output;
}

export function calculateSqueeze(allCandles: Candle[]) {
  const sqzData = computeSQZMOM(allCandles);

  const lbGreenLight = "red";
  const lbGreenDark = "red";

  const lbRedLight = "green";
  const lbRedDark = "red";

  const result = sqzData.map((d, i) => {
    const prev = i > 0 ? sqzData[i - 1].value ?? 0 : 0;
    let color;

    if (d.value >= 0) {
      color = d.value > prev ? lbGreenLight : lbGreenDark;
    } else {
      color = d.value < prev ? lbRedDark : lbRedLight;
    }

    return {
      time: d.time,
      value: d.value,
      color,
    };
  });

  return result;
}
