import { defineStore } from "pinia";

export const createTabStore = (tabId: string) =>
  defineStore(`tab-${tabId}`, () => {
    const symbol = ref("BTCUSDT");
    const source = ref("binance");
    const interval = ref("15m");
    const exchange = ref("binance");

    const candles: any = ref([]);
    const candle = ref(null);

    const fetching = ref(false);
    const fetchError = ref(null);

    const nextClose = ref(getNow());

    const historyInterval = ref<NodeJS.Timeout | null>(null);
    const lastInterval = ref<NodeJS.Timeout | null>(null);

    const logicalRange = ref(null);
    const crosshair = ref(null);
    const defaultRightPriceWidth = ref(80)
    const chartSettings = reactive({});
    const indicators = ref([]);

    function calcularCierreSiguienteVela(velas: any) {
      if (velas.length < 2) {
        throw new Error(
          "Se necesitan al menos 2 velas para calcular el cierre de la siguiente."
        );
      }

      const ultima = velas[velas.length - 1];
      const penultima = velas[velas.length - 2];

      // Duración de la vela en milisegundos
      const duracion = ultima.time - penultima.time;

      // Timestamp del cierre de la siguiente vela
      const cierreSiguiente = ultima.time + duracion;

      return cierreSiguiente;
    }

    const fetchAll = async () => {
      await fetchCandles();
      await fetchCandle();
    };

    async function start() {
      await fetchAll();

      historyInterval.value = setInterval(async () => {
        const isClosed = nextClose.value < getNow();
        console.log(isClosed);
        if (isClosed) {
          await fetchAll();
        }
      }, 1_000);

      lastInterval.value = setInterval(() => fetchCandle(), 60_000);
    }

    function stop() {
      if (lastInterval.value) {
        clearInterval(lastInterval.value);
        lastInterval.value = null;
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

        nextClose.value = calcularCierreSiguienteVela(candles.value.slice(-2));

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
      candles,
      fetchError,
      fetching,
      reset,
      start,
      stop,
      candle,
      crosshair,
      nextClose,
      logicalRange,
      defaultRightPriceWidth
    };
  });

function defaultChartSettings() {
  return {
    theme: "dark",
    grid: true,
    priceScale: "right",
  };
}
