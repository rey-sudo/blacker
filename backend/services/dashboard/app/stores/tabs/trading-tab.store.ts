// BLACKER
// Copyright (C) 2026 Juan José Caballero Rey
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation version 3 of the License.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program. If not, see <https://www.gnu.org/licenses/>.

import { CandleBubbleSeries } from "~/packages/playground/indicators/CandleBubbleSeries/CandleBubbleSeries";
import { EMASeries } from "~/packages/playground/indicators/EMASeries/EMASeries";

export const seriesRegistry = {
  CandleBubbleSeries,
  EMASeries,
} as const;

export interface MarketPayload {
  source: string;
  symbol: string;
  timeframe: string;
  series: Record<string, unknown>;
}

export type SeriesRegistry = typeof seriesRegistry;
export type SeriesKind = keyof SeriesRegistry;
export type SeriesId = string;

export type LayoutSeries<K extends SeriesKind = SeriesKind> = {
  id: SeriesId;
  kind: K;
  parent?: SeriesId;
  options: any;
};

export interface ChartLayout {
  series: Map<SeriesId, LayoutSeries>;
}

type StoreEvent =
  | { type: "series-added"; series: LayoutSeries }
  | { type: "series-removed"; id: SeriesId }
  | { type: "layout-replaced" }
  | { type: "live-update"; data: any };

type Listener = (event: StoreEvent) => void;

export const useTradingTabStore = (tab: TradingTab) =>
  defineStore(`tab/${tab.id}`, () => {
    //---------------------------------------------------------------------
    // STORE SUBSCRIPTION
    //---------------------------------------------------------------------

    const listeners = new Set<Listener>();

    function subscribe(listener: Listener) {
      listeners.add(listener);

      return () => listeners.delete(listener);
    }

    function notify(event: StoreEvent) {
      listeners.forEach((listener) => listener(event));
    }

    //---------------------------------------------------------------------
    // TRADING TAB STORE
    //---------------------------------------------------------------------

    const id: string = tab.id;
    const tabColor = "primary";
    const source = ref("binance");
    const symbol = ref("BTCUSDT");
    const timeframe = ref("5m");
    const isPaused = ref(false);
    const history = ref<any>([]);
    const tabTitle = computed(() => `${symbol.value} - ${timeframe.value}`);
    const layout = ref<ChartLayout>({
      series: new Map<SeriesId, LayoutSeries>(),
    });

    //---------------------------------------------------------------------
    // METHODS
    //---------------------------------------------------------------------

    const addSeriesToLayout = (series: LayoutSeries) => {
      layout.value.series.set(series.id, series);

      notify({
        type: "series-added",
        series,
      });
    };

    const deleteLayoutSeries = (id: SeriesId) => {
      layout.value.series.delete(id);

      notify({
        type: "series-removed",
        id,
      });
    };

    function updateSession(payload: MarketPayload) {
      notify({
        type: "live-update",
        data: payload,
      });
    }

    const start = () => {
      console.log("tabStore: Starting.");
    };

    const stop = () => {
      console.log("tabStore: Stopping.");
    };

    const pause = () => {
      isPaused.value = true;
      console.log("paused");
    };

    const resume = () => {
      isPaused.value = false;
      console.log("resumed");
    };

    const getTab = () => {
      return tab;
    };

    const fetchHistory = async () => {
      try {
        const response = await $fetch("/api/market/get-history", {
          method: "POST",
          body: {
            source: source.value,
            symbol: symbol.value,
            timeframe: timeframe.value,
            limit: 1000,
          },
        });

        history.value = response.data.history;

        return response;
      } catch (err: any) {
        console.error("[TradingTabStore] Failed to fetch history:", err);
        throw err;
      } finally {
        
      }
    };

    return {
      history,
      fetchHistory,
      source,
      subscribe,
      addSeriesToLayout,
      deleteLayoutSeries,
      layout,
      updateSession,
      tabTitle,
      tabColor,
      symbol,
      timeframe,
      stop,
      id,
      pause,
      resume,
      isPaused,
      start,
      getTab,
      onMount() {},
      onUnmount() {
        pause();
      },
    };
  })();

/**
 * 
 
          {
          id: "ema-55-series",
          kind: "EMASeries",
          parent: "candle-bubble-series",
          options: {
            id: "ema-55-series",
            label: "EMA 55",
            color: "#ffb830",
            layer: "foreground",
            priceTagColor: "#ffb830",
            params: {
              lineWidth: 2,
            },
          },
        },
        
 * 
 */
