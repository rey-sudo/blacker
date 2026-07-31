import { CandleBubbleSeries } from "~/packages/playground/indicators/CandleBubbleSeries/CandleBubbleSeries";
import { EMASeries } from "~/packages/playground/indicators/EMASeries/EMASeries";

export const seriesRegistry = {
  CandleBubbleSeries,
  EMASeries,
} as const;

export interface MarketPayload {
  source: string;
  symbol: string;

  series: Record<string, any>;
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

type LayoutEvent =
  | { type: "series-added"; series: LayoutSeries }
  | { type: "series-removed"; id: SeriesId }
  | { type: "layout-replaced" }
  | { type: "live-update"; data: any };

type Listener = (event: LayoutEvent) => void;

export const useTradingTabStore = (tab: TradingTab) =>
  defineStore(`tab/${tab.id}`, () => {
    const listeners = new Set<Listener>();

    function subscribe(listener: Listener) {
      listeners.add(listener);

      return () => listeners.delete(listener);
    }

    function notify(event: LayoutEvent) {
      listeners.forEach((listener) => listener(event));
    }

    //------------------------------------

    const id: string = tab.id;

    const tabTitle = computed(() => `${symbol.value} - ${interval.value}`);
    const tabColor = "primary";

    const symbol = ref("BTCUSDT");
    const interval = ref("1m");
    const isPaused = ref(false);

    const layout = ref<ChartLayout>({
      series: new Map<SeriesId, LayoutSeries>(),
    });

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
      console.log(payload);

      notify({
        type: "live-update",
        data: {},
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

    return {
      subscribe,
      addSeriesToLayout,
      deleteLayoutSeries,
      layout,
      updateSession,
      tabTitle,
      tabColor,
      symbol,
      interval,
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
