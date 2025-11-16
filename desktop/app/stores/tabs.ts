import { defineStore } from "pinia";

export interface SymbolInfo {
  id: string;
  symbol: string;
  subtitle: string;
  description: string;
  category: string;
  exchange: string;
  base: string;
  quote: string;
  precision: number;
}

export const useTabsStore = defineStore("tabs", () => {
  const count = ref(0);

  const tabs: Ref<SymbolInfo[]> = ref([]);

  function increase() {
    count.value++;
  }

  function decrease() {
    count.value = Math.max(0, count.value - 1);
  }

  function addTab(symbol: SymbolInfo) {
    tabs.value.push(symbol);
    increase();
  }

  return {
    count,
    increase,
    decrease,
    addTab,
    tabs
  };
});
