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

export const useBacktestingTabStore = (tab: Tab) =>
  defineStore(
    `tab/${tab.id}`,
    () => {
      const id = tab.id;
      const symbol = ref("BTCUSDT");
      const interval = ref("1m");
      const isPaused = ref(false);
      const tabTitle = computed(() => `${symbol.value} - BT`);
      const tabColor = "neutral";

      const timeframes = ref<Timeframe[]>([]);

      //----------------------------------------------------------------------------------------------------------------
      // WEBSOCKET
      //----------------------------------------------------------------------------------------------------------------

      const socket = shallowRef<WebSocket | null>(null);
      const isConnected = ref(false);
      const isConnecting = ref(false);
      const messages = ref<any[]>([]);

      const connectToWs = () => {
        if (socket.value) return;

        isConnecting.value = true;

        const ws = new WebSocket("ws://localhost:3000/api/backtest/ws");

        ws.onopen = () => {
          isConnected.value = true;
          isConnecting.value = false;

          console.log("backtest ws connected");
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);

            messages.value.push(data);

            console.log("backtest message", data);
          } catch {
            console.log("raw message", event.data);
          }
        };

        ws.onerror = (error) => {
          console.error("backtest ws error", error);
        };

        ws.onclose = () => {
          isConnected.value = false;
          isConnecting.value = false;

          socket.value = null;

          console.log("backtest ws disconnected");
        };

        socket.value = ws;
      };

      const disconnectToWs = () => {
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
        disconnectToWs()
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
