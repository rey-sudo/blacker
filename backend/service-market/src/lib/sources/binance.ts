import { Candle } from "@whiterockdev/common";
import API from "../../api/index.js";

export async function fetchCandlesBinance(
  symbol: string,
  interval: string,
  limit = 500
) {
  try {
    const params: Record<string, any> = { symbol, interval, limit };

    const { data } = await API.get("/api/v3/klines", {
      baseURL: "https://api.binance.us",
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

export async function getLiveCandleBinance(symbol: string, interval: string) {
  try {
    const { data: klines } = await API.get("/api/v3/klines", {
      baseURL: "https://api.binance.us",
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
      baseURL: "https://api.binance.us",
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
