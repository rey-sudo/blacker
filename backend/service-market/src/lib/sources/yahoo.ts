import API from "../../axios/index.js";
import { Candle } from "../../types/index.js";

export interface YahooCandlesResult {
  meta: any;
  candles: Candle[];
}

/**
 * Obtiene velas de Yahoo Finance y fabrica la última vela con 1m si interval > 1m
 * solo si la última vela grande está completa.
 */
export async function fetchCandlesYahoo(
  symbol: string,
  interval: string = "15m",
  range: string = "1d"
): Promise<YahooCandlesResult> {
  try {
    // Función interna para obtener y parsear velas
    const fetchData = async (intv: string, rng: string): Promise<YahooCandlesResult> => {
      const { data } = await API.get(`/v8/finance/chart/${symbol}`, {
        baseURL: "https://query1.finance.yahoo.com",
        params: { interval: intv, range: rng },
      });

      const result = data?.chart?.result?.[0];
      const error = data?.chart?.error;

      if (error) throw new Error(`Yahoo Finance API error: ${error.description}`);
      if (!result) throw new Error(`Invalid response format from Yahoo Finance`);

      const timestamps: number[] = result.timestamp || [];
      const indicators = result.indicators?.quote?.[0] || {};

      const candles: Candle[] = timestamps
        .map((t, i) => ({
          time: t,
          open: indicators.open?.[i] ?? null,
          high: indicators.high?.[i] ?? null,
          low: indicators.low?.[i] ?? null,
          close: indicators.close?.[i] ?? null,
          volume: indicators.volume?.[i] ?? null,
        }))
        .filter((c) =>
          c.open !== null && c.high !== null && c.low !== null && c.close !== null
        );

      return { meta: result.meta, candles };
    };

    // 1. Velas del intervalo solicitado
    const { meta, candles } = await fetchData(interval, range);

    // 2. Fabricar última vela solo si interval en minutos y última vela completa
    if (interval.endsWith("m") && candles.length > 0) {
      const lastCandle = candles[candles.length - 1];

      if (
        lastCandle.open !== null &&
        lastCandle.high !== null &&
        lastCandle.low !== null &&
        lastCandle.close !== null
      ) {
        const intervalMinutes = parseInt(interval.replace("m", ""));
        const lastIntervalStart = lastCandle.time - intervalMinutes * 60;

        // Obtener velas de 1m
        const { candles: oneMinCandlesAll } = await fetchData("1m", "1d");
        const oneMinCandles = oneMinCandlesAll.filter(
          (c) => c.time >= lastIntervalStart
        );

        if (oneMinCandles.length > 0) {
          const fabricatedCandle: Candle = {
            time: lastCandle.time,
            open: oneMinCandles[0].open,
            high: Math.max(...oneMinCandles.map((c) => c.high!)),
            low: Math.min(...oneMinCandles.map((c) => c.low!)),
            close: oneMinCandles[oneMinCandles.length - 1].close,
            volume: oneMinCandles.reduce((sum, c) => sum + (c.volume ?? 0), 0),
          };

          candles[candles.length - 1] = fabricatedCandle;
        }
      }
    }

    return { meta, candles };
  } catch (err: any) {
    console.error("❌ fetchYahooChart error:", err.message);
    throw err;
  }
}
