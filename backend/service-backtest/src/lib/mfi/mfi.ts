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

/**
 * Calcula el MFI estándar siguiendo el algoritmo de TradingView
 */
function calculate(candles: Candle[], length: number): (number | null)[] {
  if (!candles || candles.length < length + 1) return [];

  const mfi: (number | null)[] = new Array(candles.length);
  const typicalPrice = candles.map((c) => (c.high + c.low + c.close) / 3);

  const rawMoneyFlow = candles.map((c, i) => {
    const volume = c.volume || (c.high - c.low) * 1000;
    return typicalPrice[i] * volume;
  });

  for (let i = 0; i < candles.length; i++) {
    // Los primeros 'length' valores son null (como na en Pine)
    if (i < length) {
      mfi[i] = null;
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

/**
 * Calcula SMA manejando valores null como Pine Script
 */
function calculateSMA(data: (number | null)[], length: number): (number | null)[] {
  if (!data || data.length < length) return [];

  const sma: (number | null)[] = new Array(data.length);

  for (let i = 0; i < data.length; i++) {
    if (i < length - 1) {
      sma[i] = null; // na en Pine
      continue;
    }

    let sum = 0;
    let count = 0;

    for (let j = 0; j < length; j++) {
      const value = data[i - j];
      if (value !== null) {
        sum += value;
        count++;
      }
    }

    sma[i] = count > 0 ? sum / count : null;
  }

  return sma;
}

/**
 * Calcula MFI con Heikin-Ashi siguiendo exactamente la lógica de Pine Script
 */
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

  const haCandles: Candle[] = [];
  let ha_open: number | null = null; // var float ha_open = na
  let prev_ha_close: number | null = null; // ha_close[1] - valor de la barra anterior

  for (let i = 0; i < candles.length; i++) {
    const mf = mfi[i];

    // Si MFI es null, skipear (como na en Pine)
    if (mf === null) {
      haCandles.push({
        time: candles[i].time,
        open: 0,
        high: 0,
        low: 0,
        close: 0,
        volume: 0,
      });
      continue;
    }

    // Pine: ha_close := (mf + nz(ha_open, mf)) / 2
    // Usa el ha_open ACTUAL (aún no actualizado para esta barra)
    const ha_close: number = (mf + (ha_open ?? mf)) / 2;

    // Pine: ha_open := na(ha_open) ? mf : (nz(ha_open) + nz(ha_close[1])) / 2
    // Actualiza ha_open para la SIGUIENTE barra usando prev_ha_close
    const new_ha_open:any = ha_open === null ? mf : (ha_open + (prev_ha_close ?? 0)) / 2;

    // Pine: ha_high = math.max(math.max(ha_close, new_ha_open), mf)
    // Usa new_ha_open que es el valor que se guardará para la siguiente barra
    const ha_high = Math.max(Math.max(ha_close, new_ha_open), mf);

    // Pine: ha_low = math.min(math.min(ha_close, new_ha_open), mf)
    const ha_low = Math.min(Math.min(ha_close, new_ha_open), mf);

    haCandles.push({
      time: candles[i].time,
      open: Number(new_ha_open.toFixed(2)),
      high: Number(ha_high.toFixed(2)),
      low: Number(ha_low.toFixed(2)),
      close: Number(ha_close.toFixed(2)),
      volume: candles[i].volume || 0,
    });

    // Actualizar variables persistentes para la siguiente barra
    prev_ha_close = ha_close; // Este será ha_close[1] en la siguiente iteración
    ha_open = new_ha_open;     // Este será el ha_open en la siguiente iteración
  }

  const smaData: TimeValue[] = mfiSMA.map((value, i) => ({
    time: candles[i].time,
    value: value !== null ? Number(value.toFixed(2)) : 0,
  }));

  return { haCandles, smaData };
}