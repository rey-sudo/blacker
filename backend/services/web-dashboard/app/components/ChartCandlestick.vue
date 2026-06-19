<template>
  <div class="chart-container">
    <div id="chart-area">
      <!-- MAIN PANE -->

      <div class="pane" id="pane-main">
        <canvas class="chart-canvas" id="canvas-main"></canvas>
        <canvas class="drawings-canvas" id="canvas-drawings"></canvas>
        <canvas class="pricescale-canvas" id="canvas-pricescale"></canvas>
        <canvas class="overlay-canvas" id="canvas-overlay"></canvas>
      </div>

      <!-- TIME AXIS -->
      <div id="time-axis">
        <canvas class="time-canvas" id="canvas-time"></canvas>
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

function generateCandles(
  count: number,
  {
    startPrice = 63332,
    startTs = Date.now(),
    intervalMs = 60_000,
    trend = 0.0001, // tendencia promedio por vela
    volatility = 0.002, // volatilidad
  } = {},
) {
  const candles = [];

  let lastClose = startPrice;

  for (let i = 0; i < count; i++) {
    const open = lastClose;

    // movimiento principal
    const randomMove = (Math.random() - 0.5) * volatility;
    const close = open * (1 + trend + randomMove);

    // mechas proporcionales al movimiento
    const bodySize = Math.abs(close - open);

    const high =
      Math.max(open, close) + bodySize * Math.random() + open * 0.0003;

    const low =
      Math.min(open, close) - bodySize * Math.random() - open * 0.0003;

    // volumen correlacionado con el movimiento
    const volume = 5 + bodySize * 0.5 + Math.random() * 10;

    const start_ts = startTs + i * intervalMs;

    candles.push({
      open: open.toFixed(2),
      high: high.toFixed(2),
      low: low.toFixed(2),
      close: close.toFixed(2),
      volume: volume.toFixed(5),
      start_ts,
      end_ts: start_ts + intervalMs,
    });

    lastClose = close;
  }

  return candles;
}

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

  const fakeData = generateCandles(500, {
    startPrice: 63332,
    trend: 0.0002, // alcista
    volatility: 0.013,
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
