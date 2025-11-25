
import { Market } from "../../types/index.js";
import { fetchCandlesBinance, getLiveCandleBinance } from "./binance.js";
import { createLiveCandleYahoo, fetchCandlesYahoo } from "./yahoo.js";

export const marketList: Record<Market, any> = {
  forex: {
    history: fetchCandlesYahoo,
    last: createLiveCandleYahoo
  },
  crypto: {
    history: fetchCandlesBinance,
    last: getLiveCandleBinance
  }
};
