import { TabKind, type Tab } from "../tabs.store";
import { useBacktestingTabStore } from "./backtesting-tab.store";
import { useTradingTabStore } from "./trading-tab.store";

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

export { useBacktestingTabStore };
