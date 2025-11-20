<template>
  <div
    ref="container"
    id="adx-container"
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
  CrosshairMode,
  LineSeries,
  PriceScaleMode,
  createSeriesMarkers,
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
    default: 200,
  },
  tabId: {
    type: String,
    required: true,
  },
  adxLength: {
    type: Number,
    required: false,
    default: 14,
  },
  diLength: {
    type: Number,
    required: false,
    default: 14,
  },
  keyLevel: {
    type: Number,
    required: false,
    default: 23,
  },
});

const useTabStore = createTabStore(props.tabId);
const tabStore = useTabStore();

const container = ref(null);

let indicator = null;
let adxSeries = null;
let plusDISeries = null;
let minusDISeries = null;
let keyLevelSeries = null;

onMounted(async () => {
  try {
    await nextTick();

    if (!container.value) {
      console.error("El contenedor no está disponible");
      return;
    }

    indicator = createChart(container.value, {
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
        if (indicator) {
          indicator.applyOptions({ width: w, height: h });
        }
      }
    );

    watch(
      () => tabStore.logicalRange,
      (range) => {
        if (range) {
          indicator.timeScale().setVisibleLogicalRange({
            from: range.from,
            to: range.to,
          });
        }
      }
    );

    // ADX Line Series
    adxSeries = indicator.addSeries(LineSeries, {
      color: "#00ff00",
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: true,
    });

    watch(
      () => tabStore.crosshair,
      (value) => {
        if (!value || !value.time) {
          indicator.clearCrosshairPosition();
          return;
        }

        indicator.setCrosshairPosition(null, value.time, adxSeries);
      }
    );

    // +DI Line Series
    plusDISeries = indicator.addSeries(LineSeries, {
      visible: false,
      color: "#26a69a",
      lineWidth: 1,
      priceLineVisible: false,
      lastValueVisible: false,
    });

    // -DI Line Series
    minusDISeries = indicator.addSeries(LineSeries, {
      visible: false,
      color: "#ef5350",
      lineWidth: 1,
      priceLineVisible: false,
      lastValueVisible: false,
    });

    // Key Level Line
    keyLevelSeries = indicator.addSeries(LineSeries, {
      color: "rgba(255, 255, 255, 0.5)",
      lineWidth: 1,
      priceLineVisible: false,
      lastValueVisible: false,
    });

    watch(
      () => tabStore.candle,
      (candle) => {
        if (tabStore.candles) {
          const allCandles = [...tabStore.candles.slice(0, -1), candle];

          // Calculate ADX
          const result = calculateADX(
            allCandles,
            props.diLength,
            props.adxLength
          );

          if (!result) return;

          const { adxData, plusDIData, minusDIData, reversalPoints } = result;

          // Set ADX data
          adxSeries.setData(adxData);

          // Set +DI data
          plusDISeries.setData(plusDIData);

          // Set -DI data
          minusDISeries.setData(minusDIData);

          // Create markers for reversal points
          const markers = reversalPoints.map((point) => ({
            time: point.time,
            position: "aboveBar",
            color: "#0096ff",
            shape: "circle",
            text: "R",
          }));

          createSeriesMarkers(adxSeries, markers);

          // Set key level line
          if (adxData.length > 0) {
            const first = adxData[0].time;
            const last = adxData[adxData.length - 1].time;

            keyLevelSeries.setData([
              { time: first, value: props.keyLevel },
              { time: last, value: props.keyLevel },
            ]);
          }

          // Apply color changes based on ADX direction
          if (adxData.length >= 2) {
            const lastIdx = adxData.length - 1;
            const color =
              adxData[lastIdx].value > adxData[lastIdx - 1].value
                ? colors.yellow
                : colors.yellow;
            adxSeries.applyOptions({ color });
          }
        }
      }
    );

    indicator.timeScale().fitContent();
  } catch (error) {
    console.error("Error al inicializar el gráfico ADX:", error);
  }
});

onBeforeUnmount(() => {
  if (indicator) {
    indicator.remove();
  }
});

// RMA (Running Moving Average) - Equivalent to ta.rma in Pine Script
function rma(data, length) {
  if (!data || data.length === 0) return [];

  const result = new Array(data.length);
  let alpha = 1.0 / length;

  // First value
  result[0] = data[0];

  // Subsequent values using exponential moving average formula
  for (let i = 1; i < data.length; i++) {
    result[i] = alpha * data[i] + (1 - alpha) * result[i - 1];
  }

  return result;
}

// True Range calculation - Equivalent to ta.tr(true)
function calculateTR(candles) {
  if (!candles || candles.length === 0) return [];

  const tr = new Array(candles.length);

  // First bar: high - low
  tr[0] = candles[0].high - candles[0].low;

  // Subsequent bars: max of (high-low, |high-close[1]|, |low-close[1]|)
  for (let i = 1; i < candles.length; i++) {
    const hl = candles[i].high - candles[i].low;
    const hc = Math.abs(candles[i].high - candles[i - 1].close);
    const lc = Math.abs(candles[i].low - candles[i - 1].close);
    tr[i] = Math.max(hl, hc, lc);
  }

  return tr;
}

// Directional Movement - Matches Pine Script logic exactly
function dirmov(candles, length) {
  if (!candles || candles.length < 2) return null;

  const upMove = new Array(candles.length);
  const downMove = new Array(candles.length);

  // First bar has no change
  upMove[0] = 0;
  downMove[0] = 0;

  // Calculate up and down movements (ta.change equivalent)
  for (let i = 1; i < candles.length; i++) {
    const up = candles[i].high - candles[i - 1].high;
    const down = candles[i - 1].low - candles[i].low;

    // Apply Pine Script logic: up > down and up > 0 ? up : 0
    upMove[i] = up > down && up > 0 ? up : 0;
    downMove[i] = down > up && down > 0 ? down : 0;
  }

  // Calculate True Range and smooth it
  const tr = calculateTR(candles);
  const smoothedTR = rma(tr, length);

  // Smooth the directional movements
  const smoothedUp = rma(upMove, length);
  const smoothedDown = rma(downMove, length);

  // Calculate +DI and -DI
  const plus = new Array(candles.length);
  const minus = new Array(candles.length);

  for (let i = 0; i < candles.length; i++) {
    plus[i] = smoothedTR[i] !== 0 ? (100 * smoothedUp[i]) / smoothedTR[i] : 0;
    minus[i] =
      smoothedTR[i] !== 0 ? (100 * smoothedDown[i]) / smoothedTR[i] : 0;
  }

  return { plus, minus };
}

// ADX Calculation - Matches Pine Script adx_func exactly
function calculateADX(candles, diLength, adxLength) {
  if (!candles || candles.length < Math.max(diLength, adxLength) + 2) {
    return null;
  }

  // Calculate directional movement
  const dm = dirmov(candles, diLength);
  if (!dm) return null;

  const { plus, minus } = dm;

  // Calculate DX
  const dx = new Array(candles.length);

  for (let i = 0; i < candles.length; i++) {
    const sum = plus[i] + minus[i];
    if (sum === 0) {
      dx[i] = 0;
    } else {
      dx[i] = (100 * Math.abs(plus[i] - minus[i])) / sum;
    }
  }

  // Smooth DX to get ADX
  const adx = rma(dx, adxLength);

  // Prepare data for chart
  const adxData = [];
  const plusDIData = [];
  const minusDIData = [];
  const reversalPoints = [];

  for (let i = 0; i < candles.length; i++) {
    adxData.push({
      time: candles[i].time,
      value: Number(adx[i].toFixed(2)),
    });

    plusDIData.push({
      time: candles[i].time,
      value: Number(plus[i].toFixed(2)),
    });

    minusDIData.push({
      time: candles[i].time,
      value: Number(minus[i].toFixed(2)),
    });

    // Detect reversal: sig < sig[1] and sig[1] > sig[2] and sig[1] > keyLevel
    if (i >= 2) {
      const rule1 = adx[i] < adx[i - 1];
      const rule2 = adx[i - 1] > adx[i - 2];
      const rule3 = adx[i - 1] > props.keyLevel;

      if (rule1 && rule2 && rule3) {
        reversalPoints.push({
          time: candles[i - 1].time,
          value: Number(adx[i - 1].toFixed(2)),
        });
      }
    }
  }

  return { adxData, plusDIData, minusDIData, reversalPoints };
}
</script>

<style scoped></style>
