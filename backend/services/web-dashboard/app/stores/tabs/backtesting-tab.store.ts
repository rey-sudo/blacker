/**
 * Supported candle intervals for backtesting and market data subscriptions.
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
 * Represents a timeframe configuration.
 */
export interface Timeframe {
  interval: TimeframeInterval;
}

/**
 * Available websocket commands sent to the backtesting backend.
 */
export const CommandType = {
  PING: "PING",
  SUBSCRIBE_STATS: "SUBSCRIBE_STATS",
  UNSUBSCRIBE_STATS: "UNSUBSCRIBE_STATS",
  START_BACKTEST: "START_BACKTEST",
  STOP_BACKTEST: "STOP_BACKTEST",
} as const;

/**
 * Union type of all supported command values.
 */
export type CommandType = (typeof CommandType)[keyof typeof CommandType];

/**
 * Incoming websocket message sent from the client to the backend.
 */
export interface InMessage {
  command: CommandType;
  payload?: Record<string, unknown>;
}

/**
 * Outgoing websocket message received from the backend.
 */
export interface OutMessage {
  event: string;
  data?: unknown;
  timestamp: string;
}

/**
 * Creates a persistent backtesting store instance for a specific tab.
 */
export const useBacktestingTabStore = (tab: Tab) =>
  defineStore(
    `tab/${tab.id}`,
    () => {
      const id = tab.id;
      const symbol = ref("BTCUSDT");
      const interval = ref("1m");
      const isPaused = ref(false);
      const tabTitle = computed(() => `${symbol.value} - BT`);
      const tabColor = tab.color;
      const timeframes = ref<Timeframe[]>([]);
      const isPlayable = computed(() => timeframes.value.length === 0);

      //----------------------------------------------------------------------------------------------------------------
      // WEBSOCKET
      //----------------------------------------------------------------------------------------------------------------

      const socket = shallowRef<WebSocket | null>(null);
      const isConnected = ref(false);
      const messages = ref<any[]>([]);

      let heartbeatInterval: ReturnType<typeof setInterval> | null = null;
      const lastPongTimestamp = ref(Date.now());
      const isResponsive = ref(false);
      const PING_INTERVAL = 5_000;
      const WATCHDOG_TIMEOUT = 12_000;

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
       * Establishes the websocket connection and starts heartbeat monitoring.
       */
      const connectToWs = () => {
        if (socket.value) return;

        const ws = new WebSocket("ws://localhost:3000/api/backtest/ws");

        ws.onopen = () => {
          isConnected.value = true;
          lastPongTimestamp.value = Date.now();
          isResponsive.value = true;

          _addHeartbeatInterval(ws);

          console.log("Backtest WS connected to store");
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log("Backtest WS message parsed", data);

            if (data.event === "PONG") {
              lastPongTimestamp.value = Date.now();
              isResponsive.value = true;
              return;
            }

            messages.value.push(data);
          } catch {
            console.log("Backtest WS message error", event.data);
          }
        };

        ws.onerror = (error) => {
          console.error("Backtest WS error", error);
          isResponsive.value = false;
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
      const disconnectToWs = () => {
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
      // TIMEFRAME
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
      // RUN LOGIC
      //----------------------------------------------------------------------------------------------------------------

      /**
       * Starts the backtesting store service.
       */
      const start = () => {
        console.log(`backtestingStore: ${id} starting...`);
        connectToWs();
      };

      /**
       * Stops the backtesting session and disconnects from the backend.
       */
      const stop = () => {
        console.log(`backtestingStore: ${id} stopping...`);
        disconnectToWs();
      };

      /**
       * Pauses the backtesting workflow.
       */
      const pause = () => {
        isPaused.value = true;
        console.log("paused");
      };

      /**
       * Resumes the backtesting workflow.
       */
      const resume = () => {
        isPaused.value = false;
        console.log("resumed");
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
        pause();
        disconnectToWs();
      };

      return {
        isResponsive,
        addTimeframe,
        timeframes,
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
        isPlayable,
        sendMessage,
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
              interval: state.interval,
              timeframes: state.timeframes,
              isPaused: state.isPaused,
            });
          },

          deserialize: (raw) => {
            try {
              const parsed = JSON.parse(raw);

              if (
                typeof parsed.symbol !== "string" ||
                typeof parsed.interval !== "string" ||
                !Array.isArray(parsed.timeframes)
              ) {
                throw new Error("Estructura inválida");
              }

              return {
                symbol: parsed.symbol,
                interval: parsed.interval as TimeframeInterval,
                timeframes: parsed.timeframes,
                isPaused: parsed.isPaused ?? false,
              };
            } catch (err) {
              console.warn(
                `[backtesting-tab-${tab.id}] Estado corrupto, reseteando:`,
                err,
              );

              return {
                symbol: "BTCUSDT",
                interval: "1m" as TimeframeInterval,
                timeframes: [],
                isPaused: false,
              };
            }
          },
        },
      },
    },
  )();
