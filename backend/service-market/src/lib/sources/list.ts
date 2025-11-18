import { Source } from "../../types/index.js";
import { fetchCandlesBinance, getLiveCandleBinance } from "./binance.js";
import { createLiveCandleYahoo, fetchCandlesYahoo } from "./yahoo.js";

export const sourceList: Record<Source, any> = {
  yahoo: {
    history: fetchCandlesYahoo,
    last: createLiveCandleYahoo
  },
  binance: {
    history: fetchCandlesBinance,
    last: getLiveCandleBinance
  }
};
