<template>
  <div
    ref="container"
    id="heikinAshi-container"
    :style="{
      width: width + 'px',
      height: height + 'px',
      maxWidth: width + 'px',
      maxHeight: height + 'px',
    }"
  ></div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, nextTick, watch } from "vue";
import {
  createChart,
  CandlestickSeries,
  PriceScaleMode,
} from "lightweight-charts";

const props = defineProps({
  width: {
    type: Number,
    required: false,
    default: 800,
  },
  height: {
    type: Number,
    required: false,
    default: 400,
  },
  tabId: {
    type: String,
    required: true,
  },
  smoothingLength: {
    type: Number,
    required: false,
    default: 1,
  },
});

const useTabStore = createTabStore(props.tabId);
const tabStore = useTabStore();

const container = ref(null);

let chart = null;
let haSeries = null;

onMounted(async () => {
  try {
    await nextTick();

    if (!container.value) {
      console.error("El contenedor no está disponible");
      return;
    }

    chart = createChart(container.value, {
      layout: {
        background: { color: "transparent" },
        textColor: colors.text.primary,
      },
      rightPriceScale: {
        visible: true,
        minimumWidth: tabStore.defaultRightPriceWidth,
        mode: PriceScaleMode.Normal,
      },
      timeScale: {
        visible: true,
        handleScroll: false,
        handleScale: false,
        fixLeftEdge: false,
        fixRightEdge: false,
        lockVisibleTimeRangeOnResize: true,
        barSpacing: 10,
        rightOffset: 20,
        timeVisible: true,
        secondsVisible: false,
      },
      grid: {
        vertLines: { color: "transparent" },
        horzLines: { color: "transparent" },
      },
    });

    watch(
      () => [props.width, props.height],
      ([w, h]) => {
        if (chart) {
          chart.applyOptions({ width: w, height: h });
        }
      }
    );

    watch(
      () => tabStore.logicalRange,
      (range) => {
        if (range && chart) {
          chart.timeScale().setVisibleLogicalRange({
            from: range.from,
            to: range.to,
          });
        }
      }
    );

    haSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#26a69a",
      downColor: "#ef5350",
      borderVisible: false,
      wickUpColor: "#26a69a",
      wickDownColor: "#ef5350",
    });

    watch(
      () => tabStore.crosshair,
      (value) => {
        if (!value || !value.time) {
          chart.clearCrosshairPosition();
          return;
        }

        chart.setCrosshairPosition(null, value.time, haSeries);
      }
    );

    watch(
      () => tabStore.candle,
      (candle) => {
        if (tabStore.candles) {
          const allCandles = [...tabStore.candles.slice(0, -1), candle];

          const haData = calculateHeikenAshiCustom(
            allCandles,
            props.smoothingLength
          );

          const chartData = haData.map((ha) => ({
            time: ha.time,
            open: ha.open,
            high: ha.high,
            low: ha.low,
            close: ha.close,
          }));

          haSeries.setData(chartData);
        }
      }
    );

    watch(
      () => props.smoothingLength,
      () => {
        if (tabStore.candles) {
          const haData = calculateHeikenAshiCustom(
            tabStore.candles,
            props.smoothingLength
          );

          const chartData = haData.map((ha) => ({
            time: ha.time,
            open: ha.open,
            high: ha.high,
            low: ha.low,
            close: ha.close,
          }));

          haSeries.setData(chartData);
        }
      }
    );

    chart.timeScale().fitContent();
  } catch (error) {
    console.error("Error al inicializar el gráfico Heikin Ashi:", error);
  }
});

onBeforeUnmount(() => {
  if (chart) {
    chart.remove();
  }
});

class TechnicalAnalysis {
  static calculateEMA(series, length) {
    if (series.length === 0) return [];
    if (length <= 1) return series;

    const emaArray = new Array(series.length);
    const k = 2 / (length + 1);

    emaArray[0] = series[0];

    for (let i = 1; i < series.length; i++) {
      // EMA = (Close - PrevEMA) * multiplier + PrevEMA
      emaArray[i] = (series[i] - emaArray[i - 1]) * k + emaArray[i - 1];
    }

    return emaArray;
  }
}

function calculateHeikenAshiCustom(data, smoothingLength = 0) {
  const length = data.length;
  if (length === 0) return [];

  const haOpenRaw = new Array(length);
  const haCloseRaw = new Array(length);
  const haHighRaw = new Array(length);
  const haLowRaw = new Array(length);

  for (let i = 0; i < length; i++) {
    const { open, high, low, close } = data[i];

    haCloseRaw[i] = (open + high + low + close) / 4;

    if (i === 0) {
      haOpenRaw[i] = (open + close) / 2;
    } else {
      haOpenRaw[i] = (haOpenRaw[i - 1] + haCloseRaw[i - 1]) / 2;
    }

    haHighRaw[i] = Math.max(high, haOpenRaw[i], haCloseRaw[i]);
    haLowRaw[i] = Math.min(low, haOpenRaw[i], haCloseRaw[i]);
  }

  let finalOpen;
  let finalClose;
  let finalHigh;
  let finalLow;

  if (smoothingLength > 0) {
    finalOpen = TechnicalAnalysis.calculateEMA(haOpenRaw, smoothingLength);
    finalClose = TechnicalAnalysis.calculateEMA(haCloseRaw, smoothingLength);
    finalHigh = TechnicalAnalysis.calculateEMA(haHighRaw, smoothingLength);
    finalLow = TechnicalAnalysis.calculateEMA(haLowRaw, smoothingLength);
  } else {
    finalOpen = haOpenRaw;
    finalClose = haCloseRaw;
    finalHigh = haHighRaw;
    finalLow = haLowRaw;
  }

  const GREEN = "green";
  const RED = "red";

  return finalOpen.map((open, i) => {
    const close = finalClose[i];
    const isBullish = close >= open;

    return {
      time: data[i].time,
      open: open,
      high: finalHigh[i],
      low: finalLow[i],
      close: close,
      isBullish: isBullish,
      color: isBullish ? GREEN : RED,
    };
  });
}
</script>

<style scoped>
#heikinAshi-container {
  width: 100%;
  height: 100%;
  min-height: 100%;
  background: var(--chart-background);
  border-bottom: 1px solid var(--ui-border);
}
</style>
