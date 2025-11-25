import { Request, Response } from "express";
import { marketList } from "../lib/sources/list.js";
import { ApiError } from "@whiterockdev/common";
import { Market } from "../types/index.js";

export const getCandleMiddlewares: any = [];

export const getCandleHandler = async (req: Request, res: Response) => {
  let connection = null;
  let response = null;

  try {
    const { symbol, interval, market } = req.query;

    const missing = ["symbol", "interval", "market"].filter(
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

    const data = await client.last(symbol, interval);

    response = data;

    res.status(200).send({ success: true, data: response });
  } catch (err: any) {
    throw err;
  } finally {
  }
};
