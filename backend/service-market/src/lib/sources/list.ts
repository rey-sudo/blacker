import { Source } from "../../types/index.js";
import { fetchCandlesYahoo } from "./yahoo.js";

export const sourceList: Record<Source, any> = {
  yahoo: fetchCandlesYahoo,
  binance: () => null,
};
