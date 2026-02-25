import { defineStore } from "pinia";

export enum TabKind {
  Backtesting,
  Trading,
  Bots,
}

interface TabBase {
  id: string;
  kind: TabKind;
  title: string;
  subtitle: string;
  description: string;
  color: string;
}

export interface BacktestingTab extends TabBase {
  kind: TabKind.Backtesting;
  initialBalance: number;
  startDate: Date;
  endDate: Date;
}

export interface TradingTab extends TabBase {
  kind: TabKind.Trading;
  symbol: string;
  timeframe: string;
}

export interface BotsTab extends TabBase {
  kind: TabKind.Bots;
  botId: string;
  strategyName: string;
}

export type Tab = BacktestingTab | TradingTab | BotsTab;

export const useTabsStore = defineStore("tabs", () => {
  const tabsById = ref<Map<string, Tab>>(new Map());
  const tabOrder = ref<string[]>([]);

  // 🔹 Getter: tabs ordenadas
  const allTabs = computed(() =>
    tabOrder.value.map((id) => tabsById.value.get(id)!).filter(Boolean),
  );

  // 🔹 Add
  function addTab(tab: Tab) {
    if (tabsById.value.has(tab.id)) return false;

    tabsById.value.set(tab.id, tab);
    tabOrder.value.push(tab.id);
    return true;
  }

  // 🔹 Remove
  function removeTab(id: string) {
    if (!tabsById.value.has(id)) return;

    tabsById.value.delete(id);
    tabOrder.value = tabOrder.value.filter((tid) => tid !== id);
  }

  // 🔹 Move (drag & drop)
  function moveTab(fromIndex: number, toIndex: number) {
    const order = tabOrder.value;
    const moved = order.splice(fromIndex, 1)[0];

    if (moved === undefined) return;

    order.splice(toIndex, 0, moved);
  }

  return {
    addTab,
    allTabs,
    removeTab,
    moveTab,
  };
});
