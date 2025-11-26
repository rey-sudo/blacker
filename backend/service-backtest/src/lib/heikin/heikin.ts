
export interface Candle {
  time: number; 
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}


export interface HeikenAshiCandle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  color: string;    
  isBullish: boolean; 
}


class TechnicalAnalysis {

  static calculateEMA(series: number[], length: number): number[] {
    if (series.length === 0) return [];
    if (length <= 1) return series;

    const emaArray: number[] = new Array(series.length);
    const k = 2 / (length + 1);

   
    emaArray[0] = series[0];

    for (let i = 1; i < series.length; i++) {
      // EMA = (Close - PrevEMA) * multiplier + PrevEMA
      emaArray[i] = (series[i] - emaArray[i - 1]) * k + emaArray[i - 1];
    }

    return emaArray;
  }
}

export function calculateHeikenAshiCustom(
  data: Candle[], 
  smoothingLength: number = 0
): HeikenAshiCandle[] {
  
  const length = data.length;
  if (length === 0) return [];


  const haOpenRaw: number[] = new Array(length);
  const haCloseRaw: number[] = new Array(length);
  const haHighRaw: number[] = new Array(length);
  const haLowRaw: number[] = new Array(length);


  for (let i = 0; i < length; i++) {
    const { open, high, low, close } = data[i];


    haCloseRaw[i] = (open + high + low + close) / 4;

    
    if (i === 0) {
      haOpenRaw[i] = (open + close) / 2;
    } else {
      haOpenRaw[i] = (haOpenRaw[i - 1] + haCloseRaw[i - 1]) / 2;
    }


    haHighRaw[i] = Math.max(high, Math.max(haOpenRaw[i], haCloseRaw[i]));

   
    haLowRaw[i] = Math.min(low, Math.min(haOpenRaw[i], haCloseRaw[i]));
  }


  let finalOpen: number[];
  let finalClose: number[];
  let finalHigh: number[];
  let finalLow: number[];

  if (smoothingLength > 0) {
    finalOpen = TechnicalAnalysis.calculateEMA(haOpenRaw, smoothingLength);
    finalClose = TechnicalAnalysis.calculateEMA(haCloseRaw, smoothingLength);
    finalHigh = TechnicalAnalysis.calculateEMA(haHighRaw, smoothingLength);
    finalLow = TechnicalAnalysis.calculateEMA(haLowRaw, smoothingLength);
  } else {
    finalOpen = haOpenRaw;
    finalClose = haCloseRaw;
    finalHigh = haHighRaw;
    finalLow = haLowRaw;
  }

  const GREEN = "green"; 
  const RED = 'red';   

  return finalOpen.map((open, i) => {
    const close = finalClose[i];
    const isBullish = close >= open;

    return {
      time: data[i].time,
      open: open,
      high: finalHigh[i],
      low: finalLow[i],
      close: close,
      isBullish: isBullish,
      color: isBullish ? GREEN : RED
    };
  });
}