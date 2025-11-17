import API from "../../axios/index.js";
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
  range = "1d"
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
