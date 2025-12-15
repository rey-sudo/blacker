import API from "../../api/index.js";
import { Candle } from "@whiterockdev/common";
import { CustomError } from "../../common/error/customError.js";

export interface GetCandlesParams {
  symbol: string;
  interval: string;
  window: number;
}

export interface getCandlesResponse {
  result: boolean;
  data: Candle[];
}

export async function fetchCandles(
  host: string,
  params: GetCandlesParams
): Promise<Candle[]> {
  try {
    const response = await API.get(host + "/api/market/get-candles", {
      params,
    });

    return response.data.data;
  } catch (err: any) {
    throw new CustomError({
      message: "Error fetching candles",
      error: err,
      event: "error.slave",
      context: { service: process.env.SLAVE_NAME, function: "fetchCandles" },
    });
  }
}

export async function fetchCandle(
  host: string,
  params: GetCandlesParams
): Promise<Candle[]> {
  try {
    const response = await API.get(host + "/api/market/get-candle", {
      params,
    });

    return response.data.data;
  } catch (err: any) {
    throw err;
  }
}
