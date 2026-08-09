import type { ChartLayout, LayoutSeries, SeriesId } from ".";

/**
 * Backend backtester GlobalState interface
 */
export interface BacktestingTabGlobalState {
  status: string;
  replayStatus: string;
  engineConnected: boolean;
  timeframes: Record<string, BacktestTimeframe>;
}

type BacktestingTabStoreEvent =
  | { type: "series-added"; series: LayoutSeries }
  | { type: "live-update"; data: any };

type Listener = (event: BacktestingTabStoreEvent) => void;


export const useBacktestingTabStore = (tab: BacktestingTab) =>
  defineStore(
    `tab/${tab.id}`,
    () => {
      //---------------------------------------------------------------------
      // STORE SUBSCRIPTION
      //---------------------------------------------------------------------

      const listeners = new Set<Listener>();

      function subscribe(listener: Listener) {
        listeners.add(listener);

        return () => listeners.delete(listener);
      }

      function notify(event: BacktestingTabStoreEvent) {
        listeners.forEach((listener) => listener(event));
      }

      //---------------------------------------------------------------------
      // SUBS
      //---------------------------------------------------------------------

      const id = tab.id;
      const symbol = ref(tab.symbol);
      const tabTitle = computed(() => `${symbol.value} - BT`);
      const tabColor = "warning";
      const layout = ref<ChartLayout>({
        series: new Map<SeriesId, LayoutSeries>(),
      });
      const globalState = ref<BacktestingTabGlobalState>({
        status: "init",
        replayStatus: "Stopped",
        engineConnected: false,
        timeframes: {},
      });
      const isReady = computed(() => globalState.value.status === "Ready");
      const isPending = computed(() => globalState.value.status === "Pending");
      const isRunning = computed(
        () => globalState.value.replayStatus === "Running",
      );
      const isStopped = computed(
        () => globalState.value.replayStatus === "Stopped",
      );
      const isPlayable = computed(() => {
        Object.keys(globalState.value.timeframes).length;
      });

      //---------------------------------------------------------------------
      // MAIN LOGIC
      //---------------------------------------------------------------------

      const addSeriesToLayout = (series: LayoutSeries) => {
        layout.value.series.set(series.id, series);

        notify({
          type: "series-added",
          series,
        });
      };

      /**
       * Adds a timeframe if it is not already registered.
       */
      function addTimeframe(tf: string) {

        //TODO: POST QUERY

      }

      function updateSession(data: BacktestWsMessage) {
        globalState.value.status = data.status;
        globalState.value.replayStatus = data.replay_status;

        globalState.value.engineConnected =
          data.slaves["Engine"]?.connected || false;

        notify({
          type: "live-update",
          data,
        });
      }

      async function startBacktest() {
        try {
          const response = await $fetch("/api/backtest/master/start-backtest", {
            method: "POST",
            body: {},
          });

          return response;
        } catch (err: any) {
          console.error("[BacktestingTabStore] Failed to start backtest:", err);
          throw err;
        }
      }

      async function stopBacktest() {
        try {
          const response = await $fetch("/api/backtest/master/stop-backtest", {
            method: "POST",
            body: {},
          });

          return response;
        } catch (err: any) {
          console.error("[BacktestingTabStore] Failed to stop backtest:", err);
          throw err;
        }
      }
      //---------------------------------------------------------------------
      // UTILS
      //---------------------------------------------------------------------

      /**
       * Returns the associated tab instance.
       */
      const getTab = () => {
        return tab;
      };

      //---------------------------------------------------------------------
      // COMPONENT LIFECYCLE
      //---------------------------------------------------------------------

      /**
       * Lifecycle hook executed when the tab is mounted.
       */
      const onMount = () => {};

      /**
       * Lifecycle hook executed when the tab is unmounted.
       * Ensures the session is paused and disconnected.
       */
      const onUnmount = () => {};

      return {
        stopBacktest,
        isRunning,
        startBacktest,
        layout,
        addSeriesToLayout,
        subscribe,
        addTimeframe,
        updateSession,
        tabTitle,
        tabColor,
        symbol,
        id,
        getTab,
        isPlayable,
        globalState,
        isReady,
        isStopped,
        onMount,
        onUnmount,
      };
    },
    {
      persist: {
        key: `backtesting-tab-${tab.id}`,

        serializer: {
          serialize: (state) => {
            return JSON.stringify({
              symbol: state.symbol,
              timeframes: state.timeframes,
            });
          },

          deserialize: (raw) => {
            try {
              const parsed = JSON.parse(raw);

              if (
                typeof parsed.symbol !== "string" ||
                !Array.isArray(parsed.timeframes)
              ) {
                throw new Error("Estructura inválida");
              }

              return {
                symbol: parsed.symbol,
                timeframes: parsed.timeframes,
              };
            } catch (err) {
              console.warn(
                `[backtesting-tab-${tab.id}] Estado corrupto, reseteando:`,
                err,
              );

              return {
                symbol: "BTCUSDT",
                timeframes: [],
              };
            }
          },
        },
      },
    },
  )();
