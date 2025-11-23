import { Candle } from "../../types/index.js";

export function calculateRSI(candles: Candle[], period = 14) {
  const closes = candles.map((c) => c.close);
  const rsi = new Array(closes.length).fill(null);

  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) gains += diff;
    else losses -= diff;
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  rsi[period] = 100 - 100 / (1 + avgGain / avgLoss);

  for (let i = period + 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    const gain = Math.max(diff, 0);
    const loss = Math.max(-diff, 0);

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;

    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    rsi[i] = 100 - 100 / (1 + rs);
  }

  const first = rsi.find((v) => v !== null);
  for (let i = 0; i < rsi.length; i++) {
    if (rsi[i] === null) rsi[i] = first;
  }

  return rsi.map((v, i) => ({
    time: candles[i].time,
    value: Number(v.toFixed(2)),
  }));
}
