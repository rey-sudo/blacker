export type TimeframeInterval =
  | "1m"
  | "5m"
  | "15m"
  | "30m"
  | "1h"
  | "4h"
  | "1d"
  | "1w";

export interface Timeframe {
  interval: TimeframeInterval;
}

export const CommandType = {
  PING: "PING",
  SUBSCRIBE_STATS: "SUBSCRIBE_STATS",
  UNSUBSCRIBE_STATS: "UNSUBSCRIBE_STATS",
  START_BACKTEST: "START_BACKTEST",
  STOP_BACKTEST: "STOP_BACKTEST",
} as const;

export type CommandType = (typeof CommandType)[keyof typeof CommandType];

export interface InMessage {
  command: CommandType;
  payload?: Record<string, unknown>;
}

export interface OutMessage {
  event: string;
  data?: unknown;
  timestamp: string;
}

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

      //----------------------------------------------------------------------------------------------------------------
      // WEBSOCKET
      //----------------------------------------------------------------------------------------------------------------

      const socket = shallowRef<WebSocket | null>(null);
      const isConnected = ref(false);
      const messages = ref<any[]>([]);

      let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
      const lastPongReceived = ref(Date.now());
      const isResponsive = ref(true);
      const PING_INTERVAL = 5_000;
      const WATCHDOG_TIMEOUT = 12000;

      const connectToWs = () => {
        if (socket.value) return;

        const ws = new WebSocket("ws://localhost:3000/api/backtest/ws");

        ws.onopen = () => {
          isConnected.value = true;
          lastPongReceived.value = Date.now();

          console.log("backtest ws connected");

          heartbeatTimer = setInterval(() => {
            const now = Date.now();
            if (now - lastPongReceived.value > WATCHDOG_TIMEOUT) {
              console.error("Backend no responde, cerrando conexión...");
              ws.close();
              isResponsive.value = false;
              return;
            }

            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ command: CommandType.PING }));
            }
          }, PING_INTERVAL);
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log("backtest message", data);

            if (data.event === "PONG") {
              lastPongReceived.value = Date.now();
              isResponsive.value = true;
              return;
            }

            messages.value.push(data);
          } catch {
            console.log("raw message", event.data);
          }
        };

        ws.onerror = (error) => {
          console.error("backtest ws error", error);
        };

        ws.onclose = () => {
          isConnected.value = false;
          socket.value = null;

          if (heartbeatTimer) clearInterval(heartbeatTimer);

          console.log("backtest ws disconnected");
        };

        socket.value = ws;
      };

      const disconnectToWs = () => {
        if (heartbeatTimer) {
          clearInterval(heartbeatTimer);
          heartbeatTimer = null; 
        }

        socket.value?.close();
        socket.value = null;
      };

      const sendMessage = (payload: InMessage) => {
        if (!socket.value) return;
        if (socket.value.readyState !== WebSocket.OPEN) return;

        console.log(JSON.stringify(payload));

        socket.value.send(JSON.stringify(payload));
      };

      //----------------------------------------------------------------------------------------------------------------
      // TIMEFRAME
      //----------------------------------------------------------------------------------------------------------------

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

      const getTab = () => {
        return tab;
      };

      //----------------------------------------------------------------------------------------------------------------
      // RUN LOGIC
      //----------------------------------------------------------------------------------------------------------------

      const start = () => {
        console.log(`backtestingStore: ${id} starting...`);
        connectToWs();
      };

      const stop = () => {
        console.log(`backtestingStore: ${id} stopping...`);
        disconnectToWs();
      };

      const pause = () => {
        isPaused.value = true;
        console.log("paused");
      };

      const resume = () => {
        isPaused.value = false;
        console.log("resumed");
      };

      const onMount = () => {};

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
