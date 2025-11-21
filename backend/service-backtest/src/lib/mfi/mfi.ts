import { Candle, TimeValue } from "../../types/index.js";

const mfiLength = 14;
const smaLength = 14;

interface MFIResponse {
  haCandles: Candle[];
  smaData: TimeValue[];
}

export function calculateMFI(allCandles: Candle[]): MFIResponse {
  const result = calculateMFIHA(allCandles, mfiLength, smaLength);

  if (!result)
    return {
      haCandles: [],
      smaData: [],
    };

  return result;
}

function calculate(candles: Candle[], length: number) {
  if (!candles || candles.length < length + 1) return [];

  const mfi = new Array(candles.length);

  const typicalPrice = candles.map((c) => (c.high + c.low + c.close) / 3);

  const rawMoneyFlow = candles.map((c, i) => {
    const volume = c.volume || (c.high - c.low) * 1000;
    return typicalPrice[i] * volume;
  });

  for (let i = 0; i < candles.length; i++) {
    if (i < length) {
      mfi[i] = 50;
      continue;
    }

    let positiveFlow = 0;
    let negativeFlow = 0;

    for (let j = i - length + 1; j <= i; j++) {
      if (typicalPrice[j] > typicalPrice[j - 1]) {
        positiveFlow += rawMoneyFlow[j];
      } else if (typicalPrice[j] < typicalPrice[j - 1]) {
        negativeFlow += rawMoneyFlow[j];
      }
    }

    if (negativeFlow === 0) {
      mfi[i] = 100;
    } else if (positiveFlow === 0) {
      mfi[i] = 0;
    } else {
      const moneyFlowRatio = positiveFlow / negativeFlow;
      mfi[i] = 100 - 100 / (1 + moneyFlowRatio);
    }
  }

  return mfi;
}

function calculateSMA(data: any, length: number) {
  if (!data || data.length < length) return [];

  const sma = new Array(data.length);

  for (let i = 0; i < data.length; i++) {
    if (i < length - 1) {
      sma[i] = data[i];
    } else {
      let sum = 0;
      for (let j = 0; j < length; j++) {
        sum += data[i - j];
      }
      sma[i] = sum / length;
    }
  }

  return sma;
}

function calculateMFIHA(
  candles: Candle[],
  mfiLength: number,
  smaLength: number
) {
  if (!candles || candles.length < Math.max(mfiLength, smaLength) + 1) {
    return null;
  }

  const mfi = calculate(candles, mfiLength);

  const mfiSMA = calculateSMA(mfi, smaLength);

  const haCandles = [];
  let ha_open = null;
  let prev_ha_close = null;

  for (let i = 0; i < candles.length; i++) {
    const mf = mfi[i];
    let ha_close;

    if (ha_open === null) {
      ha_open = mf;
      ha_close = mf;
    } else {
      ha_close = (mf + ha_open) / 2;
    }

    const ha_high = Math.max(Math.max(ha_close, ha_open), mf);
    const ha_low = Math.min(Math.min(ha_close, ha_open), mf);

    haCandles.push({
      time: candles[i].time,
      open: Number(ha_open.toFixed(2)),
      high: Number(ha_high.toFixed(2)),
      low: Number(ha_low.toFixed(2)),
      close: Number(ha_close.toFixed(2)),
    });

    if (prev_ha_close === null) {
      ha_open = mf;
    } else {
      ha_open = (ha_open + prev_ha_close) / 2;
    }

    prev_ha_close = ha_close;
  }

  const smaData = mfiSMA.map((value, i) => ({
    time: candles[i].time,
    value: Number(value.toFixed(2)),
  }));

  return { haCandles, smaData };
}
