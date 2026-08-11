import type { ChartTimeframe } from "~/components/Chart.vue";
import type { LayoutSeries } from ".";

/**
 * EngineState def.
 */
export interface EngineState {
  tick_index: number;
  time: number;
  timeframes: Record<string, ChartTimeframe>;
}

/**
 * BacktestSessionMessage.
 */
export interface MasterState {
  status: string;
  replay_status: string;
  replay_step: string;
  tick_index: number;
  engine_state: EngineState;
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

      const globalState = ref<MasterState>({
        status: "",
        replay_status: "",
        replay_step: "",
        tick_index: 0,
        engine_state: {
          tick_index: 0,
          time: 0,
          timeframes: {},
        },
      });

      const id = tab.id;
      const symbol = ref(tab.symbol);
      const tabTitle = computed(() => `${symbol.value} - BT`);
      const tabColor = "warning";

      const status = computed(() => globalState.value.status);
      const replayStatus = computed(() => globalState.value.replay_status);

      const isReady = computed(() => status.value === "Ready");
      const isPending = computed(() => status.value === "Pending");

      const isRunning = computed(() => replayStatus.value === "Running");
      const isStopped = computed(() => replayStatus.value === "Stopped");

      const isPlayable = computed(
        () => Object.keys(globalState.value.engine_state.timeframes).length > 0,
      );

      const isEngineConnected = computed(() => true);

      const isExecutionConnected = computed(() => true);

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
       * Adds a timeframe if it is not already registered.
       */
      function addTimeframe(tf: string) {
        //TODO: POST QUERY
      }

      /**
       * Update session ws data.
       */
      function updateSession(data: MasterState) {
        globalState.value = data;
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
        isExecutionConnected,
        isEngineConnected,
        isPending,
        stopBacktest,
        isRunning,
        startBacktest,
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
