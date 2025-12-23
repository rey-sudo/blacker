import { Request, Response } from "express";
import { buildFootprintCandle } from "../lib/footprint/binance.js";
import {
  buildFootprintCandleDukascopy,
  getTickSize,
} from "../lib/footprint/dukascopy.js";

/* ==========================
   Controller
========================== */
export const getFootprintMiddlewares: any[] = [];

export const getFootprintHandler = async (req: Request, res: Response) => {
  try {
    const {
      symbol = "BTCUSDT",
      interval = "1h",
      source = "binance",
    } = req.query as {
      symbol?: string;
      interval?: string;
      source?: string;
    };

    console.log(req.query);

    let candle = null;

    if (source === "binance") {
      const tickSize = 0.5;
      candle = await buildFootprintCandle(symbol, interval, tickSize);
    }
    if (source === "dukascopy") {
      const tickSize = getTickSize(symbol);
      candle = await buildFootprintCandleDukascopy(symbol, interval, tickSize);
    }

    res.status(200).json({
      success: true,
      data: candle,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
};
