import { Request, Response } from "express";
import { marketList } from "../lib/sources/list.js";
import { ApiError } from "../common/errors.js";
import { Market } from "../types/index.js";

export const getCandlesMiddlewares: any = [];

export const getCandlesHandler = async (req: Request, res: Response) => {
  let connection = null;
  let response = null;

  try {
    const { symbol, interval, market, window } = req.query;

    const missing = ["symbol", "interval", "market", "window"].filter(
      (p) => !req.query[p]
    );

    if (missing.length) {
      return res
        .status(400)
        .send({ success: false, message: `Faltan: ${missing.join(",")}` });
    }

    const client = marketList[market as Market];
    if (!client) {
      throw new ApiError(400, "Unknown source");
    }

    const data = await client.history(symbol, interval, window);

    response = data.candles;

    res.status(200).send({ success: true, data: response });
  } catch (err: any) {
    throw err;
  }
};
