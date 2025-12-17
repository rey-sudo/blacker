import { Candle, CandleArraySchema, TimeValue } from "../../types/index.js";

const adxLength = 14;
const diLength = 14;
const keyLevel = 23;

export interface AverageDirectionalIndexOutput {
  adxData: TimeValue[];
  plusDIData: TimeValue[];
  minusDIData: TimeValue[];
  reversalPoints: TimeValue[];
}

/**
 * Calculates the Average Directional Index (ADX) with +DI, -DI and reversal points.
 * @param candles Array of Candle objects with time, high, low, close, volume.
 * @returns AverageDirectionalIndexOutput containing adxData, plusDIData, minusDIData, reversalPoints.
 */

export function AverageDirectionalIndex(data: Candle[]): AverageDirectionalIndexOutput {
  const verifyParams = CandleArraySchema.safeParse(data);

  if (!verifyParams.success) {
    throw new Error(
      "Invalid Candle[]: " +
        verifyParams.error.issues.map((i) => i.message).join(", ")
    );
  }

  const allCandles = verifyParams.data;

  const minCandles = Math.max(diLength, adxLength) + 100;

  if (allCandles.length < minCandles) {
    throw new Error(
      `Not enough candles. At least ${minCandles} candles are required, but only ${
        allCandles?.length || 0
      } were provided.`
    );
  }

  const result = calculate(allCandles, diLength, adxLength);

  const defaultResponse: AverageDirectionalIndexOutput = {
    adxData: [],
    plusDIData: [],
    minusDIData: [],
    reversalPoints: [],
  };

  if (!result) return defaultResponse;

  return result;
}

function rma(data: number[], length: number): number[] {
  if (!data || data.length === 0) return [];

  const result: number[] = new Array(data.length);
  const alpha = 1 / length;

  result[0] = data[0];

  for (let i = 1; i < data.length; i++) {
    result[i] = alpha * data[i] + (1 - alpha) * result[i - 1];
  }

  return result;
}

function calculateTR(candles: Candle[]): number[] {
  if (!candles || candles.length === 0) return [];

  const tr: number[] = new Array(candles.length);

  tr[0] = candles[0].high - candles[0].low;

  for (let i = 1; i < candles.length; i++) {
    const hl = candles[i].high - candles[i].low;
    const hc = Math.abs(candles[i].high - candles[i - 1].close);
    const lc = Math.abs(candles[i].low - candles[i - 1].close);
    tr[i] = Math.max(hl, hc, lc);
  }

  return tr;
}

function dirmov(
  candles: Candle[],
  length: number
): { plus: number[]; minus: number[] } | null {
  if (!candles || candles.length < 2) return null;

  const upMove: number[] = new Array(candles.length);
  const downMove: number[] = new Array(candles.length);

  upMove[0] = 0;
  downMove[0] = 0;

  for (let i = 1; i < candles.length; i++) {
    const up = candles[i].high - candles[i - 1].high;
    const down = candles[i - 1].low - candles[i].low;

    upMove[i] = up > down && up > 0 ? up : 0;
    downMove[i] = down > up && down > 0 ? down : 0;
  }

  const tr = calculateTR(candles);

  const truerange = rma(tr, length);
  const smoothedUp = rma(upMove, length);
  const smoothedDown = rma(downMove, length);

  const plus: number[] = new Array(candles.length);
  const minus: number[] = new Array(candles.length);

  for (let i = 0; i < candles.length; i++) {
    if (truerange[i] === 0) {
      plus[i] = 0;
      minus[i] = 0;
    } else {
      plus[i] = (100 * smoothedUp[i]) / truerange[i];
      minus[i] = (100 * smoothedDown[i]) / truerange[i];
    }
  }

  return { plus, minus };
}

export function calculate(
  candles: Candle[],
  diLength: number,
  adxLength: number
): AverageDirectionalIndexOutput | null {
  if (!candles || candles.length < Math.max(diLength, adxLength) + 2) {
    return null;
  }

  const dm = dirmov(candles, diLength);
  if (!dm) return null;

  const { plus, minus } = dm;

  const dx: number[] = new Array(candles.length);

  for (let i = 0; i < candles.length; i++) {
    const sum = plus[i] + minus[i];
    dx[i] = sum === 0 ? 0 : Math.abs(plus[i] - minus[i]) / sum;
  }

  const smoothedDX = rma(dx, adxLength);
  const adx = smoothedDX.map((val) => val * 100);

  const adxData: TimeValue[] = [];
  const plusDIData: TimeValue[] = [];
  const minusDIData: TimeValue[] = [];
  const reversalPoints: TimeValue[] = [];

  for (let i = 0; i < candles.length; i++) {
    adxData.push({ time: candles[i].time, value: Number(adx[i].toFixed(2)) });
    plusDIData.push({
      time: candles[i].time,
      value: Number(plus[i].toFixed(2)),
    });
    minusDIData.push({
      time: candles[i].time,
      value: Number(minus[i].toFixed(2)),
    });

    if (i >= 2) {
      const rule1 = adx[i] < adx[i - 1];
      const rule2 = adx[i - 1] > adx[i - 2];
      const rule3 = adx[i - 1] > keyLevel;

      if (rule1 && rule2 && rule3) {
        reversalPoints.push({
          time: candles[i - 1].time,
          value: Number(adx[i - 1].toFixed(2)),
        });
      }
    }
  }

  return { adxData, plusDIData, minusDIData, reversalPoints };
}
