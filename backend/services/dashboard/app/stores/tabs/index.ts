import { TabKind, type Tab } from "../tabManager.store";
import { useBacktestingTabStore } from "./backtesting-tab.store";
import { useTradingTabStore } from "./trading-tab.store";
import { CandleBubbleSeries } from "~/packages/playground/indicators/CandleBubbleSeries/CandleBubbleSeries";
import { EMASeries } from "~/packages/playground/indicators/EMASeries/EMASeries";

export function useTabContentStore(tab: Tab) {
  if (!tab) return null;

  switch (tab.kind) {
    case TabKind.Backtesting:
      return useBacktestingTabStore(tab);
    case TabKind.Trading:
      return useTradingTabStore(tab);
    //case TabKind.Algo:        return useAlgoTabStore(tab.id)
  }
}

export const seriesRegistry = {
  CandleBubbleSeries,
  EMASeries,
} as const;

export type SeriesRegistry = typeof seriesRegistry;
export type SeriesKind = keyof SeriesRegistry;
export type SeriesId = string;

export interface ChartLayout {
  series: Map<SeriesId, LayoutSeries>;
}

export type LayoutSeries<K extends SeriesKind = SeriesKind> = {
  id: SeriesId;
  kind: K;
  parent?: SeriesId;
  options: any;
};

export const DEFAULT_SERIES: LayoutSeries = {
  id: "candle-series",
  kind: "CandleBubbleSeries",
  options: {
    id: "candle-series",
    label: "Candlesticks",
    layer: "background",
    color: "red",
    priceTagColor: "#F23645",
    params: {
      bullColor: "#089981",
      bearColor: "#F23645",
    },
  },
};

export { useBacktestingTabStore };
