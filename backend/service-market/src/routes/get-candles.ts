import { Request, Response } from "express";
import { fetchCandlesYahoo } from "../lib/sources/yahoo.js";
import { sourceList } from "../lib/sources/list.js";
import { ApiError } from "../common/errors.js";
import { Source } from "../types/index.js";

export const getCandlesMiddlewares: any = [];

export const getCandlesHandler = async (req: Request, res: Response) => {
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

    const data = await getSource.history(String(symbol), String(interval));

    response = data.candles;

    res.status(200).send({ success: true, data: response });
  } catch (err: any) {
    throw err;
  } finally {
  }
};
