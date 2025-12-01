import { Candle } from "@whiterockdev/common";
import { getRealTimeRates } from "dukascopy-node";

export async function fetchCandlesDukascopy(
  symbol: string,
  interval: string,
  limit = 500
) {
  try {
    const data = await getRealTimeRates({
      instrument: symbol.toLowerCase(),
      timeframe: interval as any,
      last: limit,
      format: "json",
      volumes: true,
    } as any);

    const candles: Candle[] = data.map((c: any) => ({
      time: Math.floor(c.timestamp / 1000),
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
      volume: c.volume ?? 0,
    }));

    return {
      meta: { symbol, interval, limit },
      candles,
    };
  } catch (error) {
    console.error("Error fetching real-time candles:", error);
    return [];
  }
}

export async function fetchCandleDukascopy(symbol: string, interval: string) {
  try {
    const data = await getRealTimeRates({
      instrument: symbol.toLowerCase(),
      timeframe: interval as any,
      last: 1,
      format: "json",
      volumes: true,
    } as any);

    console.log(data);

    const candles: Candle[] = data.map((c: any) => ({
      time: Math.floor(c.timestamp / 1000),
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
      volume: c.volume,
    }));

    const lastCandle = candles.at(-1);

    if (lastCandle) {
      const candle: Candle = {
        time: lastCandle.time,
        open: lastCandle.open,
        high: lastCandle.high,
        low: lastCandle.low,
        close: lastCandle.close,
        volume: lastCandle.volume,
      };

      return candle;
    }

    return [];
  } catch (error) {
    console.error("Error fetching real-time candles:", error);
    return [];
  }
}
