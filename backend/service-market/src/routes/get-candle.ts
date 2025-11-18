import { Request, Response } from "express";
import { sourceList } from "../lib/sources/list.js";
import { ApiError } from "../common/errors.js";
import { Source } from "../types/index.js";
import {
  fetchCandlesYahoo,
  createLiveCandle,
} from "../lib/sources/yahoo.js";

export const getCandleMiddlewares: any = [];

export const getCandleHandler = async (req: Request, res: Response) => {
  let connection = null;
  let response = null;

  try {
    const { symbol, source, exchange, interval } = req.query;

    const missing = ["symbol", "source", "interval", "exchange"].filter(
      (p) => !req.query[p]
    );
    if (missing.length)
      return res
        .status(400)
        .send({ success: false, message: `Faltan: ${missing.join(",")}` });

    const getSource = sourceList[String(source).toLowerCase() as Source];

    if (!getSource) {
      throw new ApiError(400, "Unknown source");
    }

    if (symbol === String(symbol)) {
      const liveCandles = await fetchCandlesYahoo(String(symbol), "1m", "5d");

      const last = createLiveCandle(liveCandles.candles, String(interval));

      response = last;
    }

    res.status(200).send({ success: true, data: response });
  } catch (err: any) {
    throw err;
  } finally {
  }
};
