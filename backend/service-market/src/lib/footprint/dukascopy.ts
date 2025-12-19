import { Request, Response } from "express";
import { getRealTimeRates } from "dukascopy-node";

/* ==========================
   Tipos
========================== */

type FootprintLevel = {
  price: number;
  bid: number;
  ask: number;
};

type FootprintCandle = {
  instrument: string;
  interval: string;
  start: number;
  end: number;
  high: number;
  low: number;
  tickSize: number;
  levels: FootprintLevel[];
  metadata: {
    totalTicks: number;
    aggressiveBuys: number;
    aggressiveSells: number;
    netDelta: number;
  };
};

type TickData = {
  timestamp: number;
  askPrice: number;
  bidPrice: number;
  askVolume?: number;
  bidVolume?: number;
};

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

/** Mapea intervalo a timeframe de Dukascopy */
function mapIntervalToTimeframe(interval: string): string {
  const value = Number(interval.slice(0, -1));
  const unit = interval.slice(-1);

  switch (unit) {
    case "m":
      if (value === 1) return "m1";
      if (value === 5) return "m5";
      if (value === 15) return "m15";
      if (value === 30) return "m30";
      throw new Error(`Unsupported minute interval: ${interval}`);
    case "h":
      if (value === 1) return "h1";
      if (value === 4) return "h4";
      throw new Error(`Unsupported hour interval: ${interval}`);
    case "d":
      if (value === 1) return "d1";
      throw new Error(`Unsupported day interval: ${interval}`);
    default:
      throw new Error(`Invalid interval unit: ${unit}`);
  }
}

/** Obtiene tickSize apropiado según el instrumento */
export function getTickSize(instrument: string): number {
  const upper = instrument.toUpperCase();
  
  // Forex pairs (5 decimales)
  if (upper.length === 6 && !upper.includes("JPY")) {
    return 0.00001;
  }
  
  // JPY pairs (3 decimales)
  if (upper.includes("JPY")) {
    return 0.001;
  }
  
  // Índices y otros
  return 0.01;
}

/* ==========================
   Dukascopy Tick Fetch
========================== */

async function fetchDukascopyTicks(
  instrument: string,
  startTime: number,
  endTime: number
): Promise<TickData[]> {
  try {
    const data = await getRealTimeRates({
      instrument: instrument.toLowerCase() as any,
      timeframe: "tick",
      format: "json",
      dates: {
        from: startTime,
        to: endTime,
      },
      volumes: true,
    });

    return data as TickData[];
  } catch (error: any) {
    throw new Error(`Dukascopy fetch error: ${error.message}`);
  }
}

/* ==========================
   Core Footprint Builder (HYBRID)
========================== */

export async function buildFootprintCandleDukascopy(
  instrument: string,
  interval: string,
  tickSize: number
): Promise<FootprintCandle> {
  const intervalMs = intervalToMs(interval);

  const end = floorToInterval(Date.now(), intervalMs);
  const start = end - intervalMs;

  const ticks = await fetchDukascopyTicks(instrument, start, end);

  if (ticks.length === 0) {
    return {
      instrument,
      interval,
      start,
      end,
      high: 0,
      low: 0,
      tickSize,
      levels: [],
      metadata: {
        totalTicks: 0,
        aggressiveBuys: 0,
        aggressiveSells: 0,
        netDelta: 0,
      },
    };
  }

  /* --------------------------
     High / Low reales (usando mid price)
  -------------------------- */
  let high = -Infinity;
  let low = Infinity;

  for (const tick of ticks) {
    const midPrice = (tick.askPrice + tick.bidPrice) / 2;
    if (midPrice > high) high = midPrice;
    if (midPrice < low) low = midPrice;
  }

  /* --------------------------
     Niveles correctos (FIX)
  -------------------------- */
  const highLevel = ceilToTick(high, tickSize);
  const lowLevel = floorToTick(low, tickSize);

  /* --------------------------
     Inicializar niveles completos
  -------------------------- */
  const levelMap = new Map<number, FootprintLevel>();

  for (let price = highLevel; price >= lowLevel; price -= tickSize) {
    const p = Number(price.toFixed(8));
    levelMap.set(p, { price: p, bid: 0, ask: 0 });
  }

  /* --------------------------
     ALGORITMO HÍBRIDO:
     Detectar aggression mediante delta de volúmenes
  -------------------------- */
  let aggressiveBuys = 0;
  let aggressiveSells = 0;

  for (let i = 1; i < ticks.length; i++) {
    const prevTick = ticks[i - 1];
    const currTick = ticks[i];

    const prevBidVol = prevTick.bidVolume || 0;
    const prevAskVol = prevTick.askVolume || 0;
    const currBidVol = currTick.bidVolume || 0;
    const currAskVol = currTick.askVolume || 0;

    // Delta de volumen (consumo de liquidez)
    const bidConsumed = Math.max(0, prevBidVol - currBidVol);
    const askConsumed = Math.max(0, prevAskVol - currAskVol);

    /* --------------------------
       COMPRA AGRESIVA (hit the ask)
       - Se consume volumen del ask
       - Asignamos al nivel del askPrice como ASK
    -------------------------- */
    if (askConsumed > 0) {
      const priceLevel = floorToTick(currTick.askPrice, tickSize);
      const level = levelMap.get(priceLevel);
      if (level) {
        level.ask += askConsumed;
        aggressiveBuys += askConsumed;
      }
    }

    /* --------------------------
       VENTA AGRESIVA (hit the bid)
       - Se consume volumen del bid
       - Asignamos al nivel del bidPrice como BID
    -------------------------- */
    if (bidConsumed > 0) {
      const priceLevel = floorToTick(currTick.bidPrice, tickSize);
      const level = levelMap.get(priceLevel);
      if (level) {
        level.bid += bidConsumed;
        aggressiveSells += bidConsumed;
      }
    }

    /* --------------------------
       ADICIONES DE LIQUIDEZ (opcional)
       Si el volumen aumenta, alguien agregó órdenes límite
       Esto es útil para detectar "walls" pero no es aggression
    -------------------------- */
    const bidAdded = Math.max(0, currBidVol - prevBidVol);
    const askAdded = Math.max(0, currAskVol - prevAskVol);

    // Puedes descomentar esto si quieres visualizar adiciones:
    /*
    if (bidAdded > 0) {
      const priceLevel = floorToTick(currTick.bidPrice, tickSize);
      const level = levelMap.get(priceLevel);
      // level.bidPassive += bidAdded; // nueva propiedad
    }
    */
  }

  /* --------------------------
     Orden final (High → Low)
  -------------------------- */
  const levels = Array.from(levelMap.values()).sort(
    (a, b) => b.price - a.price
  );

  const netDelta = aggressiveBuys - aggressiveSells;

  return {
    instrument,
    interval,
    start,
    end,
    high,
    low,
    tickSize,
    levels,
    metadata: {
      totalTicks: ticks.length,
      aggressiveBuys,
      aggressiveSells,
      netDelta,
    },
  };
}

