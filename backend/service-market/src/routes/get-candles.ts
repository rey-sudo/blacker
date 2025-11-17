import { Request, Response } from "express";
import { fetchCandlesY2FINANCE } from "../lib/sources/y2finance.js";

export const getCandlesMiddlewares: any = [];

export const getCandlesHandler = async (req: Request, res: Response) => {
  let connection = null;

  try {
    const data = await fetchCandlesY2FINANCE("EURUSD=X", "15m", "1d");
    console.log(data.meta);

    console.log("Velas recibidas:", data.candles.length);

    res.status(200).send({ success: true, data: data.candles });
  } catch (err: any) {
    throw err;
  } finally {
  }
};
