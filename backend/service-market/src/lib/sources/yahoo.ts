import API from "../../api/index.js";
import { Candle } from "../../types/index.js";

/**
 * Yahoo Finance Data.
 * @param {string} symbol - Ej: "AAPL", "BTC-USD", "EURUSD=X"
 * @param {string} interval - Ej: "1m", "2m", "5m", "15m", "1d"
 * @param {string} range - Ej: "1d", "5d", "1mo", "3mo", "1y", "max"
 */
export async function fetchCandlesYahoo(
  symbol: string,
  interval = "1m",
  range = "7d"
) {
  try {
    const url = `/v8/finance/chart/${symbol}`;

    const { data } = await API.get(url, {
      baseURL: "https://query1.finance.yahoo.com",
      params: { interval, range },
    });

    const result = data?.chart?.result?.[0];
    const error = data?.chart?.error;

    if (error) {
      throw new Error(`Yahoo Finance API error: ${error.description}`);
    }

    if (!result) {
      throw new Error(`Invalid response format from Yahoo Finance`);
    }

    const timestamps = result.timestamp || [];
    const indicators = result.indicators?.quote?.[0] || {};

    const candles = timestamps
      .map((t: number, i: number) => {
        const open = indicators.open?.[i];
        const high = indicators.high?.[i];
        const low = indicators.low?.[i];
        const close = indicators.close?.[i];

        if (
          open == null ||
          high == null ||
          low == null ||
          close == null ||
          !isFinite(open) ||
          !isFinite(high) ||
          !isFinite(low) ||
          !isFinite(close)
        ) {
          return null;
        }

        return {
          time: t,
          open,
          high,
          low,
          close,
          volume: indicators.volume?.[i] ?? 0,
        } as Candle;
      })
      .filter((c: any): c is Candle => c !== null);

    return {
      meta: result.meta,
      candles,
    };
  } catch (err: any) {
    console.error("❌ fetchYahooChart error:", err.message);
    throw err;
  }
}

export function createLiveCandleYahoo(
  candles1m: Candle[],
  timeframe: string
): Candle | null {
  const TIMEFRAME_MAP: Record<string, number> = {
    "1m": 1,
    "2m": 2,
    "5m": 5,
    "15m": 15,
    "30m": 30,
    "1h": 60,
    "2h": 120,
    "4h": 240,
    "1d": 1440,
  };

  if (!Array.isArray(candles1m) || candles1m.length === 0) return null;

  const tfMinutes = TIMEFRAME_MAP[timeframe];
  if (!tfMinutes) throw new Error(`Temporalidad no soportada: ${timeframe}`);

  const last = candles1m[candles1m.length - 1];
  if (!last || typeof last.time !== "number") return null;

  const blockSizeSec = tfMinutes * 60;
  const blockStart = last.time - (last.time % blockSizeSec);

  // Filtrar velas dentro del bloque actual
  const blockCandles = candles1m.filter(
    (c) => c.time >= blockStart && c.time < blockStart + blockSizeSec
  );

  if (blockCandles.length === 0) return null;

  // Inicializar OHLCV con valores seguros
  let open = blockCandles[0].open;
  let close = blockCandles[blockCandles.length - 1].close;
  let high = Number.NEGATIVE_INFINITY;
  let low = Number.POSITIVE_INFINITY;
  let volume = 0;

  for (const c of blockCandles) {
    if (typeof c.high === "number" && c.high > high) high = c.high;
    if (typeof c.low === "number" && c.low < low) low = c.low;
    volume += typeof c.volume === "number" ? c.volume : 0;
  }

  // Construir objeto plano para evitar Proxy y asegurar tipos Number
  return {
    time: Number(blockStart),
    open: Number(open),
    high: Number(high),
    low: Number(low),
    close: Number(close),
    volume: Number(volume),
  };
}
