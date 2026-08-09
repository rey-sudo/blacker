import type { ChartLayout, LayoutSeries, SeriesId } from ".";

/**
 * ConnectedSlave def.
 */
export interface ConnectedSlave {
  id: string;
  connected: boolean;
  status: string;
}

/**
 * EngineState def.
 */
export interface EngineState {
  tick_index: number;
  time: number;
  timeframes: Record<string, BacktestTimeframe>;
}

/**
 * Backtest timeframe.
 */
export interface BacktestTimeframe {
  name: string;
  series: Record<string, unknown>;
  timeframe_ms: number;
}

/**
 * BacktestSessionMessage.
 */
export interface BacktestSessionMessage {
  status: string;
  replay_status: string;
  replay_step: string;
  slaves: Record<string, ConnectedSlave>;
  tick_index: number;
  engine_state: EngineState;
}

/**
 * Backend backtester GlobalState interface.
 */
export interface BacktestingTabGlobalState {
  status: string;
  replayStatus: string;
  engineConnected: boolean;
  executionConnected: boolean;
  timeframes: Record<string, BacktestTimeframe>;
}

/**
 * Store event
 */
type BacktestingTabStoreEvent =
  | { type: "series-added"; series: LayoutSeries }
  | { type: "live-update"; data: any };

/**
 * Store event handler.
 */
type Listener = (event: BacktestingTabStoreEvent) => void;

/**
 * Store definition.
 */
export const useBacktestingTabStore = (tab: BacktestingTab) =>
  defineStore(
    `tab/${tab.id}`,
    () => {
      //---------------------------------------------------------------------
      // STORE
      //---------------------------------------------------------------------

      const globalState = ref<BacktestingTabGlobalState>({
        status: "init",
        replayStatus: "Stopped",
        engineConnected: false,
        executionConnected: false,
        timeframes: {},
      });

      const id = tab.id;
      const symbol = ref(tab.symbol);
      const tabTitle = computed(() => `${symbol.value} - BT`);
      const tabColor = "warning";

      const layout = ref<ChartLayout>({
        series: new Map<SeriesId, LayoutSeries>(),
      });

      const status = computed(() => globalState.value.status);
      const replayStatus = computed(() => globalState.value.replayStatus);

      const isReady = computed(() => status.value === "Ready");
      const isPending = computed(() => status.value === "Pending");

      const isRunning = computed(() => replayStatus.value === "Running");
      const isStopped = computed(() => replayStatus.value === "Stopped");

      const isPlayable = computed(
        () => Object.keys(globalState.value.timeframes).length > 0,
      );

      //---------------------------------------------------------------------
      // SUBSCRIPTIONS
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
      // METHODS
      //---------------------------------------------------------------------

      /**
       * Adds series layout.
       */
      function addSeriesToLayout(series: LayoutSeries) {
        layout.value.series.set(series.id, series);

        notify({
          type: "series-added",
          series,
        });
      }

      /**
       * Adds a timeframe if it is not already registered.
       */
      function addTimeframe(tf: string) {
        //TODO: POST QUERY
      }

      /**
       * Update session ws data.
       */
      function updateSession(data: BacktestSessionMessage) {
        globalState.value.status = data.status;
        globalState.value.replayStatus = data.replay_status;
        globalState.value.timeframes = data.engine_state.timeframes;

        globalState.value.engineConnected =
          data.slaves["Engine"]?.connected || false;

        globalState.value.executionConnected =
          data.slaves["Execution"]?.connected || false;

        notify({
          type: "live-update",
          data,
        });
      }

      /**
       * Start backtest.
       */
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

      /**
       * Stop backtest.
       */
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

      /**
       * Returns the associated tab instance.
       */
      function getTab() {
        return tab;
      }

      /**
       * Lifecycle hook executed when the tab is mounted.
       */
      function onMount() {}

      /**
       * Lifecycle hook executed when the tab is unmounted.
       * Ensures the session is paused and disconnected.
       */
      function onUnmount() {}

      return {
        isPending,
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
              globalState: state.globalState,
            });
          },

          deserialize: (raw) => {
            try {
              const parsed = JSON.parse(raw);

              return {
                symbol: parsed.symbol,
                globalState: parsed.globalState,
              };
            } catch (err) {
              console.warn(
                `[backtesting-tab-${tab.id}] Estado corrupto, reseteando:`,
                err,
              );

              return {
                symbol: "BTCUSDT",
                globalState: {},
              };
            }
          },
        },
      },
    },
  )();
