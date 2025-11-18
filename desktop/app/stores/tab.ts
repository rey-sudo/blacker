import { defineStore } from "pinia";

export const createTabStore = (tabId: string) =>
  defineStore(`tab-${tabId}`, () => {
    const symbol = ref("BTC-USD");
    const source = ref("yahoo");
    const interval = ref("15m");
    const exchange = ref("binance");

    const candles = ref([]);
    const candle = ref(null);

    const fetching = ref(false);
    const fetchError = ref(null);
    const fetchInterval = ref<NodeJS.Timeout | null>(null);

    const timerange = ref(null);
    const chartSettings = reactive({});
    const indicators = ref([]);

    async function start() {
      await fetchCandles();
      fetchInterval.value = setInterval(() => fetchCandle(), 60_000);
    }

    function stop() {
      if (fetchInterval.value) {
        clearInterval(fetchInterval.value);
        fetchInterval.value = null;
      }
    }

    function reset() {
      symbol.value = "BTCUSDT";
      interval.value = "1h";
      Object.assign(chartSettings, defaultChartSettings());
      indicators.value = [];
    }

    async function fetchCandles() {
      try {
        const res: any = await $fetch("/api/market/get-candles", {
          method: "GET",
          params: {
            symbol: symbol.value,
            source: source.value,
            interval: interval.value,
            exchange: exchange.value,
          },
        });

        candles.value = res.data;

        return res.data;
      } catch (err: any) {
        console.error("Error en fetchCandles:", err);
        fetchError.value = err?.message || "Error desconocido";
      }
    }

    async function fetchCandle() {
      try {
        fetching.value = true;

        console.log("111111111111");

        const res: any = await $fetch("/api/market/get-candle", {
          method: "GET",
          params: {
            symbol: symbol.value,
            source: source.value,
            interval: interval.value,
            exchange: exchange.value,
          },
        });

        console.log("22222222222222");
        candle.value = res.data;

        return res.data;
      } catch (err: any) {
        console.error("Error en fetchCandle:", err);
        fetchError.value = err?.message || "Error desconocido";
        fetching.value = false;
      }
    }

    return {
      symbol,
      interval,
      chartSettings,
      indicators,
      timerange,
      candles,
      fetchError,
      fetching,
      reset,
      start,
      stop,
      candle,
    };
  });

function defaultChartSettings() {
  return {
    theme: "dark",
    grid: true,
    priceScale: "right",
  };
}
