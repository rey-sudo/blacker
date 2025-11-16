import { defineStore } from "pinia";

export const createTabStore = (tabId: string) =>
  defineStore(`tab-${tabId}`, () => {

    const symbol = ref("BTCUSDT");
    const timeframe = ref("1h");
    const timerange = ref(null);
    const chartSettings = reactive({});
    const indicators = ref([]);

 
    function reset() {
      symbol.value = "BTCUSDT";
      timeframe.value = "1h";
      Object.assign(chartSettings, defaultChartSettings())
      indicators.value = [];
    }


    return {
      symbol,
      timeframe,
      chartSettings,
      indicators,
      timerange,
      reset,
    };
  });

function defaultChartSettings() {
  return {
    theme: "dark",
    grid: true,
    priceScale: "right",
  }
}
