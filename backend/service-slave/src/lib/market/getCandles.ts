import API from "../../api/index.js";
import { Candle } from "../../common/types/types.js";

export interface GetCandlesParams {
  symbol: string;
  source: string;
  interval: string;
  exchange: string;
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
