/**
 * Interfaz para la entrada de datos (Velas estándar)
 */
export interface OHLCV {
  time: number; // Timestamp
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

/**
 * Interfaz para la salida (Velas Heiken Ashi calculadas)
 */
export interface HeikenAshiCandle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  color: string;     // Representación del color (hex o nombre)
  isBullish: boolean; // Booleano útil para lógica programática
}

/**
 * Clase utilitaria para cálculos matemáticos financieros
 */
class TechnicalAnalysis {
  /**
   * Calcula la Media Móvil Exponencial (EMA) de una serie de números.
   * Replica el comportamiento de ta.ema de Pine Script (inicializa con el primer valor).
   */
  static calculateEMA(series: number[], length: number): number[] {
    if (series.length === 0) return [];
    if (length <= 1) return series;

    const emaArray: number[] = new Array(series.length);
    const k = 2 / (length + 1);

    // Pine Script inicializa la EMA con el primer valor de la serie si no hay historia previa
    emaArray[0] = series[0];

    for (let i = 1; i < series.length; i++) {
      // EMA = (Close - PrevEMA) * multiplier + PrevEMA
      emaArray[i] = (series[i] - emaArray[i - 1]) * k + emaArray[i - 1];
    }

    return emaArray;
  }
}

/**
 * Función principal para generar el indicador Heiken Ashi Custom
 * @param data Array de velas OHLC
 * @param smoothingLength Longitud de suavizado (0 = desactivado)
 */
export function calculateHeikenAshiCustom(
  data: OHLCV[], 
  smoothingLength: number = 0
): HeikenAshiCandle[] {
  
  const length = data.length;
  if (length === 0) return [];

  // 1. Arrays para almacenar los valores "Raw" (Crudos)
  const haOpenRaw: number[] = new Array(length);
  const haCloseRaw: number[] = new Array(length);
  const haHighRaw: number[] = new Array(length);
  const haLowRaw: number[] = new Array(length);

  // 2. Cálculo Heiken Ashi Básico (Iterativo)
  for (let i = 0; i < length; i++) {
    const { open, high, low, close } = data[i];

    // haCloseRaw = ((open + high + low + close) / 4)
    haCloseRaw[i] = (open + high + low + close) / 4;

    // Cálculo recursivo de haOpenRaw
    // Pine: haOpenRaw := ( (nz(haOpenRaw[1], ((open + close) / 2))) * 0.5 ) + (haCloseRaw[1] * 0.5)
    if (i === 0) {
      haOpenRaw[i] = (open + close) / 2;
    } else {
      haOpenRaw[i] = (haOpenRaw[i - 1] + haCloseRaw[i - 1]) / 2;
    }

    // haHighRaw = math.max(high, math.max(haOpenRaw, haCloseRaw))
    haHighRaw[i] = Math.max(high, Math.max(haOpenRaw[i], haCloseRaw[i]));

    // haLowRaw  = math.min(low,  math.min(haOpenRaw, haCloseRaw))
    haLowRaw[i] = Math.min(low, Math.min(haOpenRaw[i], haCloseRaw[i]));
  }

  // 3. Aplicar suavización si es necesario
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

  // 4. Construir resultado final con colores
  // Pine Colors: bullColor = green, bearColor = red
  const GREEN = "green"; // Color aproximado de TradingView Green
  const RED = 'red';   // Color aproximado de TradingView Red

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