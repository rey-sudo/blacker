import API from "../../api/index.js";
import { Candle, logger } from "@whiterockdev/common";

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
    logger.error(err)
    throw err;
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
