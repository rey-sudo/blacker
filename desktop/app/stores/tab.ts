import { defineStore } from "pinia";

export const createTabStore = (tabId: string) =>
  defineStore(`tab-${tabId}`, () => {
    const symbol = ref("BTCUSDT");
    const market = ref("crypto");
    const interval = ref("5m");
    const window = ref(500);

    const slaveId = ref("");

    const candles: any = ref([]);
    const candle = ref(null);
    const lastPrice = ref(0);

    const fetching = ref(false);
    const fetchError = ref(null);

    const nextClose = ref(getNow());

    const historyInterval = ref<NodeJS.Timeout | null>(null);
    const lastInterval = ref<NodeJS.Timeout | null>(null);

    const logicalRange = ref(null);
    const crosshair = ref(null);
    const defaultRightPriceWidth = ref(100);
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

      historyInterval.value = setInterval(
        async () => {
          const isClosed = nextClose.value < getNow();
          console.log(isClosed);
          if (isClosed) {
            await fetchAll();
          }
        },
        slaveId.value ? 60_000 : 60_000
      );

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
        const QUERY_URL = slaveId.value
          ? `/api/slave/${slaveId.value}/get-candles`
          : "/api/market/get-candles";

        const res: any = await $fetch(QUERY_URL, {
          method: "GET",
          params: {
            symbol: symbol.value,
            market: market.value,
            interval: interval.value,
            window: window.value,
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

        const QUERY_URL = slaveId.value
          ? `/api/slave/${slaveId.value}/get-candle`
          : "/api/market/get-candle";

        const res: any = await $fetch(QUERY_URL, {
          method: "GET",
          params: {
            symbol: symbol.value,
            market: market.value,
            interval: interval.value,
            window: window.value,
          },
        });

        console.log("22222222222222");

        candle.value = res.data;
        lastPrice.value = res.data.close;

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
      lastPrice,
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
      defaultRightPriceWidth,
    };
  });

function defaultChartSettings() {
  return {
    theme: "dark",
    grid: true,
    priceScale: "right",
  };
}
