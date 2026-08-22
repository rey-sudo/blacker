import { TabKind, type Tab } from "../tabManager.store";
import { useBacktestingTabStore } from "./backtesting-tab.store";
import { useTradingTabStore } from "./trading-tab.store";
import { CandleBubbleSeries, type CandleBubbleConfig } from "~/packages/playground/indicators/CandleBubbleSeries/CandleBubbleSeries";
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
  CandleSeries: (config: CandleBubbleConfig) => CandleBubbleSeries(config),
} as const;
export type SeriesRegistry = typeof seriesRegistry;
export type SeriesKind = keyof SeriesRegistry;
export type SeriesId = string;

export { useBacktestingTabStore };
