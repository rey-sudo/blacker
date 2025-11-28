import { Candle } from "../../types/index.js";

export interface EMAValue {
  time: number;
  value: number | null;
}

export function calculateEMA(candleData: Candle[], emaLength: number): EMAValue[] {
  const emaData: EMAValue[] = [];
  const alpha = 2 / (emaLength + 1);
  let previousEMA: number | null = null;

  for (let i = 0; i < candleData.length; i++) {
    const { time, close } = candleData[i];

    if (i < emaLength - 1) {
      emaData.push({ time, value: null });
      continue;
    }

    if (i === emaLength - 1) {
      let sum = 0;
      for (let j = 0; j < emaLength; j++) {
        sum += candleData[i - j].close;
      }
      previousEMA = sum / emaLength;

      emaData.push({ time, value: previousEMA });
      continue;
    }

    const emaValue: number = close * alpha + previousEMA! * (1 - alpha);

    previousEMA = emaValue;

    emaData.push({ time, value: emaValue });
  }

  return emaData;
}
