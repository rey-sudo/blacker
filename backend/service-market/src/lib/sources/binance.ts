import API from "../../api";
import { Candle } from "../../types";

/**
 * Binance Kline/Candlestick Data.
 * @param {string} symbol - Ej: "BTCUSDT", "ETHUSDT"
 * @param {string} interval - Ej: "1m", "5m", "1h", "1d"
 * @param {number} [startTime] - Timestamp inicial en ms (opcional)
 * @param {number} [endTime] - Timestamp final en ms (opcional)
 * @param {number} [limit=500] - Número máximo de velas (máx 1000)
 */
export async function fetchCandlesBinance(
  symbol: string,
  interval: string,
  startTime?: number,
  endTime?: number,
  limit = 500
) {
  try {
    const params: Record<string, any> = { symbol, interval, limit };
    if (startTime) params.startTime = startTime;
    if (endTime) params.endTime = endTime;

    const { data } = await API.get("/api/v3/klines", {
      baseURL: "https://api.binance.com",
      params,
    });

    if (!Array.isArray(data)) {
      throw new Error("Invalid response format from Binance API");
    }

    const candles = data
      .map((k: any[]) => {
        const [time, open, high, low, close, volume] = k;

        const o = parseFloat(open);
        const h = parseFloat(high);
        const l = parseFloat(low);
        const c = parseFloat(close);
        const v = parseFloat(volume);

        if (![o, h, l, c].every((n) => isFinite(n))) return null;

        return {
          time: Math.floor(time / 1000),
          open: o,
          high: h,
          low: l,
          close: c,
          volume: v,
        } as Candle;
      })
      .filter((c: any): c is Candle => c !== null);

    return {
      meta: { symbol, interval, limit },
      candles,
    };
  } catch (err: any) {
    console.error("❌ fetchBinanceKlines error:", err.message);
    throw err;
  }
}



/**
 * Obtiene la última vela en formación para un símbolo en Binance
 * @param symbol - Ej: "BTCUSDT"
 * @param interval - Ej: "1m", "5m", "15m"
 */
export async function getLiveCandleBinance(
  symbol: string,
  interval: string
) {
  try {

    const { data: klines } = await API.get("/api/v3/klines", {
      baseURL: "https://api.binance.com",
      params: { symbol, interval, limit: 1 },
    });

    if (!Array.isArray(klines) || klines.length === 0) {
      throw new Error("No klines returned from Binance");
    }

    const lastKline = klines[0];
    let [openTime, open, high, low, close, volume] = lastKline;

    open = parseFloat(open);
    high = parseFloat(high);
    low = parseFloat(low);
    close = parseFloat(close);
    volume = parseFloat(volume);

    const { data: ticker } = await API.get("/api/v3/ticker/price", {
      baseURL: "https://api.binance.com",
      params: { symbol },
    });

    const lastPrice = parseFloat(ticker.price);

    const currentCandle: Candle = {
      time: Math.floor(openTime / 1000),
      open,
      high: Math.max(high, lastPrice),
      low: Math.min(low, lastPrice),
      close: lastPrice,
      volume,
    };

    return currentCandle;
  } catch (err: any) {
    console.error("❌ fetchCurrentCandleBinance error:", err.message);
    throw err;
  }
}
