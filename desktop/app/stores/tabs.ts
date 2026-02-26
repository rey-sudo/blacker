import { defineStore } from "pinia";

export enum TabKind {
  Backtesting = "Backtesting",
  Trading = "Trading",
  Bots = "Bots"
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
  symbol: string;
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

  const activeTabId = ref<string | null>(null);

  function setActiveTab(id: string) {
    activeTabId.value = id;
  }

  const allTabs = computed(() =>
    tabOrder.value.map((id) => tabsById.value.get(id)!).filter(Boolean),
  );

  function addTab(tab: Tab) {
    console.log("Adding tab:", tab.id);

    if (tabsById.value.has(tab.id)) return false;

    tabsById.value.set(tab.id, tab);
    tabOrder.value.push(tab.id);

    activeTabId.value = tab.id;
    return true;
  }

  function removeTab(id: string) {
    if (!tabsById.value.has(id)) return;

    tabsById.value.delete(id);
    tabOrder.value = tabOrder.value.filter((tid) => tid !== id);
  }

  function moveTab(fromIndex: number, toIndex: number) {
    const order = tabOrder.value;
    const moved = order.splice(fromIndex, 1)[0];

    if (moved === undefined) return;

    order.splice(toIndex, 0, moved);

    console.log("tabOrder", tabOrder.value)
  }

  function selectTab(id: string): boolean {
    if (!tabsById.value.has(id)) return false;

    activeTabId.value = id;
    return true;
  }

  function getTabById(id: string): Tab | undefined {
    return tabsById.value.get(id);
  }
  return {
    addTab,
    allTabs,
    removeTab,
    moveTab,
    setActiveTab,
    activeTabId,
    selectTab,
    getTabById
  };
});
