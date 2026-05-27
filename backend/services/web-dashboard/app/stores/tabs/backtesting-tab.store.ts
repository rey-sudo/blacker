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

      const addTimeframe = (timeframe: Timeframe) => {
        const exists = timeframes.value.some(
          (t) => t.interval === timeframe.interval,
        );

        if (exists) return;

        timeframes.value.push(timeframe);
      };

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

      const onMount = () => {};

      const onUnmount = () => {
        pause();
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
