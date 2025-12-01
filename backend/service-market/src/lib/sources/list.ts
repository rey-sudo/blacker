
import { Market } from "../../types/index.js";
import { fetchCandlesBinance, getLiveCandleBinance } from "./binance.js";
import { fetchCandleDukascopy, fetchCandlesDukascopy } from "./dukascopy.js";
import { createLiveCandleYahoo } from "./yahoo.js";

export const marketList: Record<Market, any> = {
  forex: {
    history: fetchCandlesDukascopy,
    last: fetchCandleDukascopy
  },
  crypto: {
    history: fetchCandlesBinance,
    last: getLiveCandleBinance
  }
};
