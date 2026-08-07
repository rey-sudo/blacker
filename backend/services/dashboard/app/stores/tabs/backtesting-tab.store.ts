/**
 * Backend backtester BacktesterState interface
 */
export type BacktesterState =
  | "pending"
  | "init"
  | "running"
  | "stopped"
  | "closed";

/**
 * Backend backtester GlobalState interface
 */
export interface GlobalState {
  state: BacktesterState;
  initialized: boolean;
  symbol: null | string;
  timeframes: Timeframe[];
  tick_state: boolean;
  engine_state: boolean;
}

/**
 * Backend supported candle intervals for backtesting and market data subscriptions.
 */
export type TimeframeInterval =
  | "1m"
  | "5m"
  | "15m"
  | "30m"
  | "1h"
  | "4h"
  | "1d"
  | "1w";

/**
 * Backend represents a timeframe configuration.
 */
export interface Timeframe {
  interval: TimeframeInterval;
}

/**
 * Backend available websocket commands sent to the backtesting backend.
 */
export const CommandType = {
  PING: "PING",
  INIT: "INIT",
  CONFIGURE: "CONFIGURE",
  SUBSCRIBE_STATS: "SUBSCRIBE_STATS",
  UNSUBSCRIBE_STATS: "UNSUBSCRIBE_STATS",
  START_BACKTEST: "START_BACKTEST",
  STOP_BACKTEST: "STOP_BACKTEST",
} as const;

/**
 * Backend union type of all supported command values.
 */
export type CommandType = (typeof CommandType)[keyof typeof CommandType];

/**
 * Backend incoming websocket message sent from the client to the backend.
 */
export interface InMessage {
  command: CommandType;
  payload?: Record<string, unknown>;
}

/**
 * Backend outgoing websocket message received from the backend.
 */
export interface OutMessage {
  event: string;
  data?: unknown;
  timestamp: string;
}

type StoreEvent = { type: "live-update"; data: any };

type Listener = (event: StoreEvent) => void;

//----------------------------------------------------------------------------------------------------------------
// BACKTESTING STORE
//----------------------------------------------------------------------------------------------------------------
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

      function notify(event: StoreEvent) {
        listeners.forEach((listener) => listener(event));
      }

      //---------------------------------------------------------------------
      // SUBS
      //---------------------------------------------------------------------

      const id = tab.id;
      const symbol = ref(tab.symbol);
      const tabTitle = computed(() => `${symbol.value} - BT`);
      const tabColor = "warning";
      // Backend read only state
      const globalState = ref<GlobalState>({
        state: "pending",
        initialized: false,
        symbol: null,
        timeframes: [],
        tick_state: false,
        engine_state: false,
      });
      const timeframes = ref<Timeframe[]>([]);
      const isRunning = computed(() => globalState.value.state === "running");
      const isStopped = computed(() => globalState.value.state === "stopped");
      const isPlayable = computed(() => timeframes.value.length > 0);

      const lastCandle = ref(null);

      //---------------------------------------------------------------------
      // MAIN LOGIC
      //---------------------------------------------------------------------

      /**
       * Adds a timeframe if it is not already registered.
       */
      function addTimeframe(timeframe: Timeframe) {
        const exists = timeframes.value.some(
          (t) => t.interval === timeframe.interval,
        );
        if (exists) return;

        timeframes.value.push(timeframe);
      }

      function updateSession(data: BacktestWsMessage) {
        notify({
          type: 'live-update',
          data
        })
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
        subscribe,
        addTimeframe,
        updateSession,
        lastCandle,
        timeframes,
        tabTitle,
        tabColor,
        symbol,
        id,
        getTab,
        isPlayable,
        globalState,
        isRunning,
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
