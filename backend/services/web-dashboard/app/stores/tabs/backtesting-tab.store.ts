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

//----------------------------------------------------------------------------------------------------------------
// BACKTESTING STORE
//----------------------------------------------------------------------------------------------------------------
export const useBacktestingTabStore = (tab: BacktestingTab) =>
  defineStore(
    `tab/${tab.id}`,
    () => {
      const id = tab.id;
      const symbol = ref(tab.symbol);
      const tabTitle = computed(() => `${symbol.value} - BT`);
      const tabColor = tab.color;

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

      const listeners = new Set();
      const lastCandle = ref(null);

      function subscriber(fn: any) {
        listeners.add(fn);

        return () => {
          listeners.delete(fn);
        };
      }

      function _pushLiveCandle(candle: any) {
        lastCandle.value = candle;
        listeners.forEach((fn: any) => fn(candle));
      }

      function clear() {
        listeners.clear();
      }

      //----------------------------------------------------------------------------------------------------------------
      // WEBSOCKET
      //----------------------------------------------------------------------------------------------------------------

      const PING_INTERVAL = 5_000;
      const WATCHDOG_TIMEOUT = 12_000;

      let heartbeatInterval: ReturnType<typeof setInterval> | null = null;
      const lastPongTimestamp = ref(Date.now());
      const isResponsive = ref(false);

      const socket = shallowRef<WebSocket | null>(null);
      const isConnected = ref(false);
      const messages = ref<any[]>([]);

      /**
       * Add heartbeatInterval timer
       */
      const _addHeartbeatInterval = (ws: WebSocket) => {
        heartbeatInterval = setInterval(() => {
          const now = Date.now();

          if (now - lastPongTimestamp.value > WATCHDOG_TIMEOUT) {
            console.error("Backtest WS is not responding, closing...");
            ws.close();
            return;
          }

          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ command: CommandType.PING }));
          }
        }, PING_INTERVAL);
      };

      /**
       * Stops the heartbeat timer and marks the backend as unresponsive.
       */
      const _clearHeartbeat = () => {
        if (heartbeatInterval) {
          clearInterval(heartbeatInterval);
          heartbeatInterval = null;
          isResponsive.value = false;
        }
      };

      /**
       *  Handles PONG message event
       */
      const _onPongEvent = () => {
        lastPongTimestamp.value = Date.now();
        isResponsive.value = true;
      };

      /**
       *  Handles STATE message event
       */
      const _onStateEvent = (event: OutMessage) => {
        globalState.value = event.data as GlobalState;
      };

      /**
       *  Handles ENGINE message event
       */
      const _onEngineEvent = (events: OutMessage) => {
        for (const e of events.data as any) {
          const eventData = e.data as any;
         
          _pushLiveCandle(
            eventData?.engineState?.timeframes?.["30m"]?.live_candle,
          );
        }
      };

      /**
       *  start to listen STATE event
       */
      const _listenState = () => {
        const message: InMessage = {
          command: CommandType.INIT,
          payload: {
            symbol: symbol.value,
          },
        };

        sendMessage(message);
      };

      /**
       *  Backend WS events handler
       */
      const _handleEvents = (event: MessageEvent<string>) => {
        try {
          const data: OutMessage = JSON.parse(event.data);

          if (data.event === "PONG") {
            return _onPongEvent();
          }

          if (data.event === "STATE") {
            return _onStateEvent(data);
          }

          if (data.event === "ENGINE") {
            return _onEngineEvent(data);
          }

          messages.value.push(data);
        } catch {
          console.log("Backtest WS message error", event.data);
        }
      };

      /**
       * Establishes the websocket connection and starts heartbeat monitoring.
       */
      const _connectToWs = () => {
        if (socket.value) return;

        const ws = new WebSocket("ws://localhost:3000/api/backtest/ws");

        ws.onopen = () => {
          isConnected.value = true;

          _addHeartbeatInterval(ws);

          _listenState();

          console.log("Backtest WS connected to store");
        };

        ws.onmessage = (event: MessageEvent<string>) => {
          _handleEvents(event);
        };

        ws.onerror = (error) => {
          console.error("Backtest WS error", error);
        };

        ws.onclose = () => {
          isConnected.value = false;
          socket.value = null;

          _clearHeartbeat();

          console.log("Backtest WS disconnected");
        };

        socket.value = ws;
      };

      /**
       * Closes the websocket connection and cleans up resources.
       */
      const _disconnectToWs = () => {
        _clearHeartbeat();

        socket.value?.close();
        socket.value = null;
      };

      /**
       * Sends a command message to the backend if the connection is open.
       */
      const sendMessage = (payload: InMessage) => {
        if (!socket.value) return;
        if (socket.value.readyState !== WebSocket.OPEN) return;

        console.log(JSON.stringify(payload));

        socket.value.send(JSON.stringify(payload));
      };

      //----------------------------------------------------------------------------------------------------------------
      // MAIN LOGIC
      //----------------------------------------------------------------------------------------------------------------

      /**
       * Adds a timeframe if it is not already registered.
       */
      const addTimeframe = (timeframe: Timeframe) => {
        const exists = timeframes.value.some(
          (t) => t.interval === timeframe.interval,
        );
        if (exists) return;

        timeframes.value.push(timeframe);
      };

      /**
       * Run backend Backtester flow
       */
      const playBacktest = () => {
        if (!isPlayable.value) return;

        const message: InMessage = {
          command: CommandType.START_BACKTEST,
          payload: {
            timeframes: timeframes.value,
          },
        };

        sendMessage(message);
      };

      /**
       * Stop backend Backtester flow
       */
      const stopBacktest = () => {
        if (!isRunning.value) return;

        const message: InMessage = {
          command: CommandType.STOP_BACKTEST,
          payload: {},
        };

        sendMessage(message);
      };

      //----------------------------------------------------------------------------------------------------------------
      // MAIN CONTROLS
      //----------------------------------------------------------------------------------------------------------------

      /**
       * Starts the backtesting store service.
       */
      const startStore = () => {
        console.log(`backtestingStore: ${id} starting...`);
        _connectToWs();
      };

      /**
       * Stops the backtesting session and disconnects from the backend.
       */
      const stopStore = () => {
        console.log(`backtestingStore: ${id} stopping...`);
        _disconnectToWs();
      };

      //----------------------------------------------------------------------------------------------------------------
      // UTILS
      //----------------------------------------------------------------------------------------------------------------

      /**
       * Returns the associated tab instance.
       */
      const getTab = () => {
        return tab;
      };

      //----------------------------------------------------------------------------------------------------------------
      // COMPONENT LIFECYCLE
      //----------------------------------------------------------------------------------------------------------------

      /**
       * Lifecycle hook executed when the tab is mounted.
       */
      const onMount = () => {};

      /**
       * Lifecycle hook executed when the tab is unmounted.
       * Ensures the session is paused and disconnected.
       */
      const onUnmount = () => {
        _disconnectToWs();
      };

      return {
        lastCandle,
        subscriber,
        clear,
        isResponsive,
        addTimeframe,
        timeframes,
        tabTitle,
        tabColor,
        symbol,
        stopStore,
        id,
        startStore,
        getTab,
        isPlayable,
        sendMessage,
        playBacktest,
        stopBacktest,
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
