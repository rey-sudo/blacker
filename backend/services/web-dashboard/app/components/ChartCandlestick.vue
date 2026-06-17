<template>
  <div class="chart-container">
    <div id="chart-area">
      <!-- MAIN PANE -->
      <div class="pane" id="pane-main">
        <canvas class="chart-canvas" id="canvas-main"></canvas>
        <canvas class="drawings-canvas" id="canvas-drawings"></canvas>
        <canvas class="pricescale-canvas" id="canvas-pricescale"></canvas>
        <canvas class="overlay-canvas" id="overlay-main"></canvas>
      </div>

      <!-- TIME AXIS -->
      <div id="time-axis">
        <canvas id="canvas-time"></canvas>
      </div>

      <!-- SCROLLBAR -->
      <div id="scrollbar">
        <div id="scrollthumb"></div>
      </div>

      <div id="chart-legend"></div>
      <div id="chart-indicators"></div>

      <div id="statusbar">
        <span id="status-fps">60 FPS</span>
        <span id="status-bars"></span>
        <span id="status-zoom"></span>
        <span id="status-cursor"></span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ChartEngine } from "@/packages/chart.js";
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

function normalizeCandles(candles: any) {
  return candles.map((candle: any) => ({
    t: Math.floor(candle.start_ts / 1000), // timestamp en segundos
    o: Number(candle.open),
    h: Number(candle.high),
    l: Number(candle.low),
    c: Number(candle.close),
    v: Number(candle.volume),
  }));
}

function normalizeCandle(candle: any) {
  return {
    t: Math.floor(candle.start_ts / 1000), // timestamp en segundos
    o: Number(candle.open),
    h: Number(candle.high),
    l: Number(candle.low),
    c: Number(candle.close),
    v: Number(candle.volume),
  };
}

onMounted(() => {
  const chart = new ChartEngine();

  chart.applyOptions({
    colors: {
      bg: getCssVariable("--chart-background"),
      bg2: getCssVariable("--chart-background"),
      bg3: getCssVariable("--chart-background"),
      bull: "rgb(8, 153, 129)",
      bear: "rgb(242, 54, 69)",
      grid: getCssVariable("--ui-border"),
    },
  });

  const fakeData = [
    {
      open: "63332",
      high: "63344",
      low: "63260.12",
      close: "63263.08",
      volume: "9.95372",
      start_ts: 1780876800000,
      end_ts: 1780876860000,
    },
    {
      open: "63263.09",
      high: "63274",
      low: "63220.74",
      close: "63237.64",
      volume: "14.71391",
      start_ts: 1780876860000,
      end_ts: 1780876920000,
    },
    {
      open: "63237.64",
      high: "63246.71",
      low: "63192",
      close: "63203.55",
      volume: "13.77433",
      start_ts: 1780876920000,
      end_ts: 1780876980000,
    },
  ];

  chart.load(normalizeCandles(fakeData));

  chart._updateStatus();
  
  if (tabStore.value?.subscriber) {
    const unsubscribe = tabStore.value.subscriber((candle: any) => {
      const newCandle = normalizeCandle(candle);
      //console.log(newCandle);
      chart.update(newCandle);
    });
  }
});
</script>

<style lang="css" scoped>
.chart-container {
  width: 100%;
  height: 100%;
  display: flex;
  overflow: hidden;
}
</style>
