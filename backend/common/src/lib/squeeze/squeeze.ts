import { Candle } from "../../types/index.js";

const BB_LENGTH = 20;
const KC_LENGTH = 20;
const KC_MULT = 1.5;
const USE_TR = true;
const lbGreenLight = "red";
const lbGreenDark = "blue";
const lbRedLight = "green";
const lbRedDark = "red";

type Numeric = number | null;

interface SqueezeRawOutput {
  time: number;
  value: number;
  squeeze: "on" | "off" | "none";
}

interface SqueezeFinalOutput {
  time: number;
  value: number;
  color: string;
}

function sma(values: number[], length: number): Numeric {
  if (values.length < length) return null;
  let sum = 0;
  for (let i = values.length - length; i < values.length; i++) {
    sum += values[i];
  }
  return sum / length;
}

function stdev(values: number[], length: number): Numeric {
  if (values.length < length) return null;
  const mean = sma(values, length);
  if (mean === null) return null;

  let total = 0;
  for (let i = values.length - length; i < values.length; i++) {
    const d = values[i] - mean;
    total += d * d;
  }
  return Math.sqrt(total / length);
}

function highest(arr: number[], length: number): Numeric {
  return arr.length >= length
    ? Math.max(...arr.slice(arr.length - length))
    : null;
}

function lowest(arr: number[], length: number): Numeric {
  return arr.length >= length
    ? Math.min(...arr.slice(arr.length - length))
    : null;
}

function linreg(values: number[], length: number, offset = 0): Numeric {
  if (values.length < length) return null;

  let xSum = 0;
  let ySum = 0;
  let xySum = 0;
  let xxSum = 0;

  const start = values.length - length;

  for (let i = 0; i < length; i++) {
    const x = i;
    const y = values[start + i];
    xSum += x;
    ySum += y;
    xySum += x * y;
    xxSum += x * x;
  }

  const denom = length * xxSum - xSum * xSum;
  if (denom === 0) return null;

  const slope = (length * xySum - xSum * ySum) / denom;
  const intercept = (ySum - slope * xSum) / length;

  const x = length - 1 + offset;
  return slope * x + intercept;
}

function trueRange(candle: Candle, prev: Candle | null): number {
  if (!prev) return candle.high - candle.low;

  return Math.max(
    candle.high - candle.low,
    Math.abs(candle.high - prev.close),
    Math.abs(candle.low - prev.close)
  );
}

function computeSQZMOM(candles: Candle[]): SqueezeRawOutput[] {
  const close = candles.map((c) => c.close);
  const high = candles.map((c) => c.high);
  const low = candles.map((c) => c.low);

  const tr = candles.map((c, i) => trueRange(c, i > 0 ? candles[i - 1] : null));

  const output: SqueezeRawOutput[] = [];
  const oscHistory: number[] = [];

  for (let i = 0; i < candles.length; i++) {
    const sliceClose = close.slice(0, i + 1);

    // Bollinger Bands
    const basis = sma(sliceClose, BB_LENGTH);
    const dev = stdev(sliceClose, BB_LENGTH);

    const upperBB =
      basis !== null && dev !== null ? basis + dev * KC_MULT : null;
    const lowerBB =
      basis !== null && dev !== null ? basis - dev * KC_MULT : null;

    // Keltner Channels
    const maKC = sma(sliceClose, KC_LENGTH);
    const rangeMa = sma(tr.slice(0, i + 1), KC_LENGTH);

    const upperKC =
      maKC !== null && rangeMa !== null ? maKC + rangeMa * KC_MULT : null;
    const lowerKC =
      maKC !== null && rangeMa !== null ? maKC - rangeMa * KC_MULT : null;

    if (
      basis === null ||
      dev === null ||
      maKC === null ||
      rangeMa === null ||
      upperBB === null ||
      lowerBB === null ||
      upperKC === null ||
      lowerKC === null
    ) {
      output.push({
        time: candles[i].time,
        value: 0,
        squeeze: "none",
      });
      continue;
    }

    // Squeeze states
    const sqzOn = lowerBB > lowerKC && upperBB < upperKC;
    const sqzOff = lowerBB < lowerKC && upperBB > upperKC;
    const sqzState: "on" | "off" | "none" = sqzOn
      ? "on"
      : sqzOff
      ? "off"
      : "none";

    // Oscillator
    const hi = highest(high.slice(0, i + 1), KC_LENGTH);
    const lo = lowest(low.slice(0, i + 1), KC_LENGTH);
    const midSMA = sma(sliceClose, KC_LENGTH);

    if (hi === null || lo === null || midSMA === null) {
      output.push({
        time: candles[i].time,
        value: 0,
        squeeze: sqzState,
      });
      continue;
    }

    const mid = ((hi + lo) / 2 + midSMA) / 2;
    const osc = close[i] - mid;

    oscHistory.push(osc);
    const momentumValue = linreg(oscHistory, KC_LENGTH, 0) ?? 0;

    output.push({
      time: candles[i].time,
      value: momentumValue,
      squeeze: sqzState,
    });
  }

  return output;
}

export function calculateSqueeze(allCandles: Candle[]): SqueezeFinalOutput[] {
  const sqzData = computeSQZMOM(allCandles);

  return sqzData.map((d, i) => {
    const prev = i > 0 ? sqzData[i - 1].value : 0;
    let color: string;

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
}
