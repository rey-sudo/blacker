<template>
  <div class="chart-container">
    <div id="chart-area" class="chart-area"></div>
  </div>
</template>

<script setup lang="ts">
import { createChart } from "@/packages/src/index";
import { CandleBubbleSeries } from "@/packages/playground/indicators/CandleBubbleSeries/CandleBubbleSeries";
import { useBacktestingTabStore } from "~/stores/tabs";

const props = defineProps({
  tabId: {
    type: String,
    required: true,
  },
  timeframe: {
    type: Object,
    required: true,
  },
});

const tabsStore = useTabsStore();
const tab: ComputedRef<Tab | undefined> = computed(() =>
  tabsStore.getTabById(props.tabId),
);
const tabStore = computed(() =>
  tab.value ? useBacktestingTabStore(tab.value as BacktestingTab) : undefined,
);

const fakeData = [
  {
    time: 1785280680,
    open: 63604.0,
    high: 63611.9,
    low: 63604.0,
    close: 63611.9,
    volume: 13.385999999999965,
    start_ts: 1785280680000,
    end_ts: 1785280740000,
  },
  {
    time: 1785280740,
    open: 63611.9,
    high: 63612.0,
    low: 63600.0,
    close: 63600.1,
    volume: 74.86900000000011,
    start_ts: 1785280740000,
    end_ts: 1785280800000,
  },
  {
    time: 1785280800,
    open: 63600.1,
    high: 63630.9,
    low: 63596.8,
    close: 63607.5,
    volume: 140.6930000000017,
    start_ts: 1785280800000,
    end_ts: 1785280860000,
  },
  {
    time: 1785280860,
    open: 63607.6,
    high: 63607.6,
    low: 63607.5,
    close: 63607.5,
    volume: 40.31200000000004,
    start_ts: 1785280860000,
    end_ts: 1785280920000,
  },
  {
    time: 1785280920,
    open: 63607.6,
    high: 63607.6,
    low: 63607.5,
    close: 63607.6,
    volume: 23.334000000000042,
    start_ts: 1785280920000,
    end_ts: 1785280980000,
  },
  {
    time: 1785280980,
    open: 63607.6,
    high: 63607.6,
    low: 63541.9,
    close: 63553.0,
    volume: 232.91100000000233,
    start_ts: 1785280980000,
    end_ts: 1785281040000,
  },
  {
    time: 1785281040,
    open: 63552.9,
    high: 63565.2,
    low: 63552.9,
    close: 63565.2,
    volume: 61.61499999999988,
    start_ts: 1785281040000,
    end_ts: 1785281100000,
  },
  {
    time: 1785281100,
    open: 63565.1,
    high: 63565.2,
    low: 63526.0,
    close: 63540.5,
    volume: 140.71000000000112,
    start_ts: 1785281100000,
    end_ts: 1785281160000,
  },
  {
    time: 1785281160,
    open: 63540.5,
    high: 63584.1,
    low: 63540.5,
    close: 63584.1,
    volume: 39.72700000000031,
    start_ts: 1785281160000,
    end_ts: 1785281220000,
  },
  {
    time: 1785281220,
    open: 63584.1,
    high: 63589.8,
    low: 63569.6,
    close: 63569.7,
    volume: 45.848999999999755,
    start_ts: 1785281220000,
    end_ts: 1785281280000,
  },
];

if (tabStore.value?.subscriber) {
  const unsubscribe = tabStore.value.subscriber((candle: any) => {});
}

onMounted(() => {
  let chart1 = createChart(document.getElementById("chart-area")!);
  chart1.api.applyOptions({ legend: "Bitcoin/Tether USD · 4h" });
  const chart1_candles = chart1.api.addSeries(CandleBubbleSeries);
  chart1_candles.setData(fakeData);
});
</script>

<style lang="css" scoped>
.chart-container {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  overflow-y: auto;
  overflow-x: hidden;
}

.chart-area {
  min-height: 80vh;
}
</style>
