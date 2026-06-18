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
import { ChartEngine } from "@/packages/src/chart.js";
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
  {
    open: "63203.55",
    high: "63218.42",
    low: "63180.15",
    close: "63195.21",
    volume: "11.24891",
    start_ts: 1780876980000,
    end_ts: 1780877040000,
  },
  {
    open: "63195.21",
    high: "63210.88",
    low: "63170.44",
    close: "63182.73",
    volume: "8.93742",
    start_ts: 1780877040000,
    end_ts: 1780877100000,
  },
  {
    open: "63182.73",
    high: "63235.67",
    low: "63175.12",
    close: "63221.56",
    volume: "16.45283",
    start_ts: 1780877100000,
    end_ts: 1780877160000,
  },
  {
    open: "63221.56",
    high: "63248.90",
    low: "63208.33",
    close: "63239.18",
    volume: "12.66391",
    start_ts: 1780877160000,
    end_ts: 1780877220000,
  },
  {
    open: "63239.18",
    high: "63255.74",
    low: "63211.92",
    close: "63217.45",
    volume: "10.58271",
    start_ts: 1780877220000,
    end_ts: 1780877280000,
  },
  {
    open: "63217.45",
    high: "63224.16",
    low: "63188.50",
    close: "63196.82",
    volume: "9.31458",
    start_ts: 1780877280000,
    end_ts: 1780877340000,
  },
  {
    open: "63196.82",
    high: "63205.40",
    low: "63160.23",
    close: "63172.11",
    volume: "15.92734",
    start_ts: 1780877340000,
    end_ts: 1780877400000,
  },
  {
    open: "63172.11",
    high: "63198.77",
    low: "63155.80",
    close: "63190.64",
    volume: "7.84216",
    start_ts: 1780877400000,
    end_ts: 1780877460000,
  },
  {
    open: "63190.64",
    high: "63230.22",
    low: "63182.11",
    close: "63218.93",
    volume: "13.50728",
    start_ts: 1780877460000,
    end_ts: 1780877520000,
  },
  {
    open: "63218.93",
    high: "63241.85",
    low: "63205.47",
    close: "63234.70",
    volume: "11.99643",
    start_ts: 1780877520000,
    end_ts: 1780877580000,
  },
];

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
