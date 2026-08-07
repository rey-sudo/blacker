import { defineStore } from "pinia";
import type { Instrument } from "~/components/SymbolSearch.vue";

/**
 * Available tab types in the application.
 * Used as discriminant in the `Tab` union type.
 */
export enum TabKind {
  Backtesting = "Backtesting",
  Trading = "Trading",
  Algo = "Algo",
}

/**
 * Fields shared across all tab types.
 * Not used directly — extend this interface for each specific tab kind.
 */
interface TabBase {
  /** Unique identifier for the tab */
  id: string;
  kind: TabKind;
  title: string;
  subtitle: string;
  description: string;
  color: string;
}

/** Tab used for backtesting a trading strategy on historical data */
export interface BacktestingTab extends TabBase {
  kind: TabKind.Backtesting;
  symbol: string;
  source: string;
  timeframe: string;
}

/** Tab used for live or paper trading on a specific symbol and timeframe */
export interface TradingTab extends TabBase {
  kind: TabKind.Trading;
  symbol: string;
  source: string;
  timeframe: string;
}

/** Tab used to monitor or configure a specific bot */
export interface AlgoTab extends TabBase {
  kind: TabKind.Algo;
  botId: string;
  strategyName: string;
}

/**
 * Discriminated union of all possible tab types.
 * Narrow by checking `tab.kind` to access type-specific fields.
 *
 * @example
 * if (tab.kind === TabKind.Trading) {
 *   console.log(tab.id)
 * }
 */
export type Tab = BacktestingTab | TradingTab | AlgoTab;

export const useTabManager = defineStore(
  "tabs",
  () => {
    /** Primary storage — enables O(1) lookup by tab id */
    const tabsById = ref<Map<string, Tab>>(new Map());

    /** Tracks the visual order of tabs independently from the tabsById map */
    const tabOrder = ref<string[]>([]);

    /** ID of the currently active tab, or null if no tabs are open */
    const activeTabId = ref<string | null>(null);

    /**
     * Ordered list of all open tabs, derived from `tabOrder` and `tabsById`.
     * Filters out any entries that may be out of sync between the two structures.
     */
    const allTabs = computed<Tab[]>(() =>
      tabOrder.value
        .map((id) => tabsById.value.get(id))
        .filter((tab): tab is Tab => Boolean(tab)),
    );

    const symbolSearchModal = ref(false);

    /**
     * Adds a new tab and immediately activates it.
     * Does nothing and returns `false` if a tab with the same id already exists.
     *
     * @param tab - The tab object to add
     * @returns `true` if the tab was added, `false` if it already existed
     */
    function addTab(tab: Tab) {
      console.log("Adding tab:", tab.id);

      if (tabsById.value.has(tab.id)) return false;

      tabsById.value.set(tab.id, tab);
      tabOrder.value.push(tab.id);

      activeTabId.value = tab.id;
      return true;
    }

    /**
     * Removes a tab by id.
     * If the removed tab was active, the caller is responsible
     * for setting a new active tab.
     *
     * @param id - ID of the tab to remove
     */
    function closeTab(id: string) {
      if (!tabsById.value.has(id)) return;

      const index = tabOrder.value.indexOf(id);

      tabsById.value.delete(id);
      tabOrder.value = tabOrder.value.filter((tid) => tid !== id);

      if (activeTabId.value === id) {
        activeTabId.value =
          tabOrder.value[index - 1] ?? tabOrder.value[index] ?? null;
      }
    }

    /**
     * Moves a tab from one position to another in the tab bar.
     * Triggered by drag & drop interactions.
     *
     * @param fromIndex - Current index of the tab
     * @param toIndex - Target index to move the tab to
     */
    function moveTab(fromIndex: number, toIndex: number) {
      const order = tabOrder.value;
      const moved = order.splice(fromIndex, 1)[0];

      if (moved === undefined) return;

      order.splice(toIndex, 0, moved);

      tabOrder.value = order;

      console.log("tabOrder", tabOrder.value);
    }

    /**
     * Activates a tab by id after validating it exists.
     *
     * @param id - ID of the tab to activate
     * @returns `true` if the tab was found and activated, `false` otherwise
     */
    function selectTab(id: string): boolean {
      if (!tabsById.value.has(id)) return false;

      activeTabId.value = id;
      return true;
    }

    /**
     * Retrieves a tab by its id without activating it.
     *
     * @param id - ID of the tab to retrieve
     * @returns The tab object, or `undefined` if not found
     */
    function getTabById(id: string): Tab | undefined {
      return tabsById.value.get(id);
    }

    /**
     * Closes all open tabs and resets the active tab to null.
     */
    function closeAllTabs(): void {
      tabsById.value.clear();
      tabOrder.value = [];
      activeTabId.value = null;
    }

    /**
     * Creates a clone of an existing tab with a new unique id.
     * The cloned tab is inserted immediately after the original and activated.
     *
     * @param id - ID of the tab to clone
     * @returns The cloned tab, or null if the original was not found
     */
    function cloneTab(id: string): Tab | null {
      const original = tabsById.value.get(id);
      if (!original) return null;

      const clone: Tab = {
        ...original,
        id: crypto.randomUUID(),
        title: `${original.title} (copy)`,
      };

      const index = tabOrder.value.indexOf(id);

      tabsById.value.set(clone.id, clone);
      tabOrder.value.splice(index + 1, 0, clone.id);

      activeTabId.value = clone.id;

      return clone;
    }

    function getInstrumentList() {
      const symbolData: Instrument[] = [
        {
          id: "0",
          source: "binance",
          symbol: "BTCUSDT",
          status: "sync",
          legend: "Bitcoin / Dolar Futures USDM",
          market: "crypto",
        },
        {
          id: "1",
          source: "dydx",
          symbol: "BTCUSDT",
          status: "sync",
          legend: "Bitcoin / Dolar Futures",
          market: "crypto",
        },
        {
          id: "2",
          source: "hyperliquid",
          symbol: "BTCUSDT",
          status: "unsync",
          legend: "Bitcoin / Dolar Futures",
          market: "crypto",
        },
        {
          id: "3",
          source: "polymarket",
          symbol: "BTCUSDT",
          status: "sync",
          legend: "Bitcoin / Dolar Futures",
          market: "crypto",
        },
      ];

      return symbolData;
    }

    return {
      symbolSearchModal,
      getInstrumentList,
      tabsById,
      tabOrder,
      activeTabId,
      allTabs,
      addTab,
      closeTab,
      moveTab,
      selectTab,
      getTabById,
      closeAllTabs,
      cloneTab,
    };
  },
  {
    persist: {
      key: "tabs-store",
      serializer: {
        serialize: (state) => {
          return JSON.stringify({
            tabsById: Array.from(state.tabsById.entries()),
            tabOrder: state.tabOrder,
            activeTabId: state.activeTabId,
          });
        },
        deserialize: (raw) => {
          try {
            const parsed = JSON.parse(raw);
            if (
              !Array.isArray(parsed.tabsById) ||
              !Array.isArray(parsed.tabOrder)
            ) {
              throw new Error("Estructura inválida");
            }
            return {
              tabsById: new Map(parsed.tabsById),
              tabOrder: parsed.tabOrder,
              activeTabId: parsed.activeTabId ?? null,
            };
          } catch (err) {
            console.warn("[tabs-store] Estado corrupto, reseteando:", err);
            return {
              tabsById: new Map(),
              tabOrder: [],
              activeTabId: null,
            };
          }
        },
      },
    },
  },
);
