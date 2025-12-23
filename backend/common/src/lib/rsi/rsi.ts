import { Candle, CandleArraySchema } from "../../types/index.js";

export type RSIValue = {
  time: Candle["time"];
  value: number | null;
};

export type RSIValueStrict = {
  time: Candle["time"];
  value: number;
};

export type RSIResult = {
  rsiValues: RSIValue[];

  rsiValuesFilled: RSIValueStrict[];

  currentRsi: RSIValueStrict;
};

export function calculateRSI(data: Candle[], period = 14): RSIResult {
  const result = CandleArraySchema.safeParse(data);

  if (!result.success) {
    throw new Error(
      "Invalid Candle[]: " +
        result.error.issues.map((i) => i.message).join(", ")
    );
  }

  const candles = result.data;

  if (candles.length < period + 1) {
    throw new Error(
      `RSI error: at least ${period + 1} candles are required, ${
        candles.length
      } received`
    );
  }

  const closes = candles.map((c) => c.close);
  const rsi: Array<number | null> = new Array(closes.length).fill(null);

  let gains = 0;
  let losses = 0;

  // Initial average gain/loss
  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff > 0) gains += diff;
    else losses -= diff;
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  // Helper to compute RSI safely
  const computeRSI = (gain: number, loss: number): number => {
    if (loss === 0 && gain === 0) return 50;
    if (loss === 0) return 100;
    if (gain === 0) return 0;
    const rs = gain / loss;
    return 100 - 100 / (1 + rs);
  };

  rsi[period] = computeRSI(avgGain, avgLoss);

  // Wilder smoothing
  for (let i = period + 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? -diff : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;

    rsi[i] = computeRSI(avgGain, avgLoss);
  }

  const rsiValues: RSIValue[] = rsi.map((value, i) => ({
    time: candles[i].time,
    value: value === null ? null : Number(value.toFixed(2)),
  }));

  const currentRsi_ = rsiValues
    .slice()
    .reverse()
    .find((v): v is RSIValueStrict => v.value !== null);

  if (!currentRsi_) throw new Error("No RSI available yet");

  const currentRsi = currentRsi_;

  const rsiValuesFilled: RSIValueStrict[] = rsiValues.map((v) => ({
    time: v.time,
    value: v.value ?? currentRsi.value,
  }));

  return {
    rsiValues,
    rsiValuesFilled,
    currentRsi,
  };
}
