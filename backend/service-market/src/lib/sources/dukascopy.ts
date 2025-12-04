import { Candle } from "@whiterockdev/common";
import { getRealTimeRates } from "dukascopy-node";

// 🔥 Mapeo correcto de intervalos a formato Dukascopy
function mapInterval(interval: string) {
  const i = interval.toLowerCase();

  const map: Record<string, string> = {
    "1m": "m1",
    "5m": "m5",
    "15m": "m15",
    "30m": "m30",
    "1h": "h1",
    "4h": "h4",
    "1d": "d1",
    "1w": "w1",
    "1mo": "mn1",
  };

  return map[i] ?? i; // si coincide, se traduce — si no, se usa tal cual
}

export async function fetchCandlesDukascopy(
  symbol: string,
  interval: string,
  limit = 500
) {
  try {
    const mappedInterval = mapInterval(interval);

    // 1️⃣ Traemos las velas normales
    const data = await getRealTimeRates({
      instrument: symbol.toLowerCase(),
      timeframe: mappedInterval as any,
      last: limit,
      format: "json",
      volumes: true,
    } as any);

    let candles: Candle[] = data.map((c: any) => ({
      time: Math.floor(c.timestamp / 1000),
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
      volume: c.volume ?? 0,
    }));

    // 2️⃣ Verificamos si la última vela está atrasada
    const last = candles.at(-1);
    const nowSec = Math.floor(Date.now() / 1000);
    const intervalSec = (() => {
      if (interval.endsWith("m")) return parseInt(interval) * 60;
      if (interval.endsWith("h")) return parseInt(interval) * 3600;
      if (interval.endsWith("d")) return parseInt(interval) * 86400;
      return 60;
    })();

    const isLastCandleOld = !last || nowSec - last.time > intervalSec * 1.5;

    // 3️⃣ Si está vieja, reconstruimos solo la última vela
    if (isLastCandleOld) {
      const reconstructed = await reconstructLast12hCandles(symbol, mappedInterval);
      if (reconstructed.length > 0) {
        // reemplazamos únicamente la última vela
        const lastReconstructed = reconstructed.at(-1)!;
        candles[candles.length - 1] = lastReconstructed;
      }
    }

    return {
      meta: { symbol, interval, limit },
      candles,
    };
  } catch (error) {
    console.error("Error fetching real-time candles:", error);
    return { candles: [] };
  }
}


export async function fetchCandleDukascopy(symbol: string, interval: string) {
  try {
    // ✅ Mapear intervalos correctamente
    const mappedInterval = mapInterval(interval);

    // ✅ Reconstruir últimas 12h
    const candles = await reconstructLast12hCandles(symbol, mappedInterval);

    if (!candles || candles.length === 0) return [];

    // ✅ Tomar únicamente la última vela
    const lastCandle = candles.at(-1)!;

    return {
      time: lastCandle.time,
      open: lastCandle.open,
      high: lastCandle.high,
      low: lastCandle.low,
      close: lastCandle.close,
      volume: lastCandle.volume,
    };
  } catch (error) {
    console.error("Error fetching the last candle:", error);
    return [];
  }
}

const INTERVAL_SECONDS: Record<string, number> = {
  tick: 0,
  s1: 1,
  m1: 60,
  m5: 300,
  m15: 900,
  m30: 1800,
  h1: 3600,
  h4: 14400,
  d1: 86400,
};

// 🔥 Parser universal para cualquier arreglo de Dukascopy
function parseItem(arr: number[]) {
  const [ts] = arr;

  if (arr.length >= 6) {
    // OHLC
    const [, , , , close, volume] = arr;
    return { timestamp: ts, price: close, volume: volume ?? 0 };
  }

  // Tick
  const [, ask, bid, askVol, bidVol] = arr;
  const price = (bid + ask) / 2; // <-- mid price
  const volume = (askVol ?? 0) + (bidVol ?? 0);

  return { timestamp: ts, price, volume };
}


// 🔥 Agrupa ticks en velas OHLC
function buildCandles(ticks: any[], intervalSeconds: number): Candle[] {
  const buckets: Record<number, Candle> = {};

  for (const t of ticks) {
    const sec = Math.floor(t.timestamp / 1000);
    const bucket = Math.floor(sec / intervalSeconds) * intervalSeconds;

    if (!buckets[bucket]) {
      buckets[bucket] = {
        time: bucket,
        open: t.price,
        high: t.price,
        low: t.price,
        close: t.price,
        volume: t.volume,
      };
      continue;
    }

    const c = buckets[bucket];
    c.high = Math.max(c.high, t.price);
    c.low = Math.min(c.low, t.price);
    c.close = t.price;
    c.volume += t.volume;
  }

  return Object.values(buckets).sort((a, b) => a.time - b.time);
}

// 🔥 Función principal simple
export async function reconstructLast12hCandles(
  symbol: string,
  interval: string
): Promise<Candle[]> {
  try {
    const seconds = INTERVAL_SECONDS[interval];
    if (!seconds) throw new Error(`Invalid interval: ${interval}`);

    const now = Date.now();
    const from = now - 12 * 60 * 60 * 1000; // 12h

    // si el timeframe es muy grande usamos 1m para reconstruir
    const tf = seconds >= 300 ? "m1" : "tick";

    const raw = await getRealTimeRates({
      instrument: symbol.toLowerCase(),
      timeframe: tf as any,
      dates: { from, to: now },
      volumes: true,
      format: "array",
    } as any);

    const ticks = (raw as number[][]).map(parseItem);

    return buildCandles(ticks, seconds);
  } catch (err) {
    console.error("Error reconstructing last 12h:", err);
    return [];
  }
}
