import { Request, Response } from "express";

type FootprintLevel = {
  bid: number;
  ask: number;
};

type FootprintCandle = {
  start: number;
  end: number;
  levels: Record<number, FootprintLevel>;
};

const BINANCE_URL = "https://api.binance.com/api/v3/aggTrades";

// ==========================
// Utils
// ==========================
function intervalToMs(interval: string): number {
  const value = parseInt(interval.slice(0, -1));
  const unit = interval.slice(-1);

  switch (unit) {
    case "m":
      return value * 60_000;
    case "h":
      return value * 60 * 60_000;
    case "d":
      return value * 24 * 60 * 60_000;
    default:
      throw new Error("Invalid interval");
  }
}

function roundToTick(price: number, tick: number): number {
  return Math.round(price / tick) * tick;
}

// ==========================
// Core: one footprint candle
// ==========================
async function fetchFootprintCandle(
  symbol: string,
  fromTime: number,
  toTime: number,
  tickSize: number
): Promise<FootprintCandle> {
  const levels: Record<number, FootprintLevel> = {};
  let lastTime = fromTime;

  while (true) {
    const url =
      `${BINANCE_URL}?symbol=${symbol}` +
      `&startTime=${lastTime}&endTime=${toTime}&limit=1000`;

    const res = await fetch(url);
    const trades = await res.json();

    if (!Array.isArray(trades) || trades.length === 0) break;

    for (const t of trades) {
      const price = roundToTick(Number(t.p), tickSize);
      const qty = Number(t.q);

      if (!levels[price]) {
        levels[price] = { bid: 0, ask: 0 };
      }

      if (t.m) {
        // seller agresivo → BID
        levels[price].bid += qty;
      } else {
        // buyer agresivo → ASK
        levels[price].ask += qty;
      }

      lastTime = t.T + 1;
    }

    if (trades.length < 1000) break;
  }

  return {
    start: fromTime,
    end: toTime,
    levels,
  };
}

// ==========================
// Controller
// ==========================
export const getFootprintMiddlewares: any[] = [];

export const getFootprintHandler = async (req: Request, res: Response) => {
  try {
    const {
      symbol = "BTCUSDT",
      interval = "5m",
      length = "1",
    } = req.query as {
      symbol?: string;
      interval?: string;
      length?: string;
    };

    const intervalMs = intervalToMs(interval);
    const candles = parseInt(length); // cantidad de velas
    const tickSize = 0.5; // ejemplo BTC
    const now = Date.now();

    let windowStart = now - candles * intervalMs;
    const result: FootprintCandle[] = [];

    for (let i = 0; i < candles; i++) {
      const windowEnd = windowStart + intervalMs;

      const candle = await fetchFootprintCandle(
        symbol,
        windowStart,
        windowEnd,
        tickSize
      );

      console.log(candle);

      result.push(candle);
      windowStart = windowEnd;
    }

    res.status(200).send({
      success: true,
      data: result,
    });
  } catch (err: any) {
    res.status(500).send({
      success: false,
      error: err.message,
    });
  }
};
