/* ==========================
   Tipos
========================== */

type FootprintLevel = {
  price: number;
  bid: number;
  ask: number;
};

type FootprintCandle = {
  symbol: string;
  interval: string;
  start: number;
  end: number;
  high: number;
  low: number;
  tickSize: number;
  levels: FootprintLevel[];
};

const BINANCE_URL = "https://fapi.binance.com/fapi/v1/aggTrades";

/* ==========================
   Utils
========================== */

function intervalToMs(interval: string): number {
  const value = Number(interval.slice(0, -1));
  const unit = interval.slice(-1);

  if (!value || value <= 0) {
    throw new Error("Invalid interval value");
  }

  switch (unit) {
    case "m":
      return value * 60_000;
    case "h":
      return value * 60 * 60_000;
    case "d":
      return value * 24 * 60 * 60_000;
    default:
      throw new Error("Invalid interval unit");
  }
}

/** Inicio exacto de la vela */
function floorToInterval(time: number, intervalMs: number): number {
  return Math.floor(time / intervalMs) * intervalMs;
}

/** Nivel inferior correcto */
function floorToTick(price: number, tick: number): number {
  return Math.floor(price / tick) * tick;
}

/** Nivel superior correcto (CRÍTICO para cubrir el high) */
function ceilToTick(price: number, tick: number): number {
  return Math.ceil(price / tick) * tick;
}

/* ==========================
   Binance AggTrades
========================== */

async function fetchAggTrades(
  symbol: string,
  startTime: number,
  endTime: number
) {
  const trades: any[] = [];
  let lastTime = startTime;

  while (true) {
    const url =
      `${BINANCE_URL}?symbol=${symbol}` +
      `&startTime=${lastTime}&endTime=${endTime}&limit=1000`;

    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Binance error ${res.status}`);
    }

    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) break;

    for (const t of data) {
      trades.push(t);
      lastTime = t.T + 1;
    }

    if (data.length < 1000) break;
  }

  return trades;
}

/* ==========================
   Core Footprint Builder
========================== */

export async function buildFootprintCandle(
  symbol: string,
  interval: string,
  tickSize: number
): Promise<FootprintCandle> {
  const intervalMs = intervalToMs(interval);

  const end = floorToInterval(Date.now(), intervalMs);
  const start = end - intervalMs;

  const trades = await fetchAggTrades(symbol, start, end);

  if (trades.length === 0) {
    return {
      symbol,
      interval,
      start,
      end,
      high: 0,
      low: 0,
      tickSize,
      levels: [],
    };
  }

  /* --------------------------
     High / Low reales
  -------------------------- */
  let high = -Infinity;
  let low = Infinity;

  for (const t of trades) {
    const price = Number(t.p);
    if (price > high) high = price;
    if (price < low) low = price;
  }

  /* --------------------------
     Niveles correctos (FIX)
  -------------------------- */
  const highLevel = ceilToTick(high, tickSize); // CRÍTICO
  const lowLevel = floorToTick(low, tickSize);

  /* --------------------------
     Inicializar niveles completos
  -------------------------- */
  const levelMap = new Map<number, FootprintLevel>();

  for (
    let price = highLevel;
    price >= lowLevel;
    price -= tickSize
  ) {
    const p = Number(price.toFixed(8));
    levelMap.set(p, { price: p, bid: 0, ask: 0 });
  }

  /* --------------------------
     Asignar trades a niveles
  -------------------------- */
  for (const t of trades) {
    const price = floorToTick(Number(t.p), tickSize);
    const qty = Number(t.q);

    const level = levelMap.get(price);
    if (!level) continue;

    if (t.m) {
      // seller agresivo → BID
      level.bid += qty;
    } else {
      // buyer agresivo → ASK
      level.ask += qty;
    }
  }

  /* --------------------------
     Orden final (High → Low)
  -------------------------- */
  const levels = Array.from(levelMap.values()).sort(
    (a, b) => b.price - a.price
  );

  return {
    symbol,
    interval,
    start,
    end,
    high,
    low,
    tickSize,
    levels,
  };
}