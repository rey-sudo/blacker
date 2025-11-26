<template>
  <div
    ref="container"
    id="squeeze-container"
    :style="{
      width: width + 'px',
      height: height + 'px',
      maxWidth: width + 'px',
      maxHeight: height + 'px',
    }"
  ></div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, nextTick } from "vue";
import {
  createChart,
  CrosshairMode,
  CandlestickSeries,
  createSeriesMarkers,
  LineSeries,
  PriceScaleMode,
  HistogramSeries,
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
});

const useTabStore = createTabStore(props.tabId);
const tabStore = useTabStore();

const container = ref(null);

let indicator = null;

const BB_LENGTH = 20;
const KC_LENGTH = 20;
const KC_MULT = 1.5;
const USE_TR = true;

onMounted(async () => {
  try {
    await nextTick();

    if (!container.value) {
      console.error("Los contenedores no están disponibles");
      return;
    }

    indicator = createChart(container.value, {
      layout: {
        background: { color: "transparent" },
        textColor: colors.text.primary,
      },
      rightPriceScale: { visible: true, minimumWidth: tabStore.defaultRightPriceWidth, },
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
    
    const histogramSeries = indicator.addSeries(HistogramSeries, {
      priceFormat: { type: "price", precision: 4 },
    });

    watch(
      () => tabStore.crosshair,
      (value) => {
        if (!value || !value.time) {
          indicator.clearCrosshairPosition();
          return;
        }

        indicator.setCrosshairPosition(null, value.time, histogramSeries);
      }
    );

    const line = indicator.addSeries(LineSeries, {
      color: "gray",
      lineWidth: 2,
    });

    watch(
      () => tabStore.candle,
      (candle) => {
        if (tabStore.candles) {
          const allCandles = [...tabStore.candles.slice(0, -1), candle];

          const sqzData = computeSQZMOM(allCandles);

          const lbGreenLight = colors.red;
          const lbGreenDark = colors.blue;

          const lbRedLight = colors.green;
          const lbRedDark = colors.red;

          const squeezeLineColor = colors.black;

          histogramSeries.setData(
            sqzData.map((d, i) => {
              let prev = sqzData[i - 1] ? sqzData[i - 1].value : 0;
              let color;

              if (d.value >= 0) {
                color = d.value > prev ? lbGreenLight : lbGreenDark;
              } else {
                color = d.value < prev ? lbRedDark : lbRedLight;
              }

              return {
                time: d.time,
                value: d.value,
                color,
              };
            })
          );

          line.setData(
            sqzData.map((d) => ({
              time: d.time,
              value: 0,
              color: squeezeLineColor,
            }))
          );
        }
      }
    );

    indicator.timeScale().fitContent();
  } catch (error) {
    console.error("Error al inicializar los gráficos:", error);
  }
});

onBeforeUnmount(() => {
  if (indicator) {
    indicator.remove();
  }
});

function sma(values, length) {
  if (values.length < length) return null;
  let sum = 0;
  for (let i = values.length - length; i < values.length; i++) {
    sum += values[i];
  }
  return sum / length;
}

function stdev(values, length) {
  if (values.length < length) return null;
  const mean = sma(values, length);
  let total = 0;
  for (let i = values.length - length; i < values.length; i++) {
    const d = values[i] - mean;
    total += d * d;
  }
  return Math.sqrt(total / length);
}

function highest(arr, length) {
  return arr.length >= length
    ? Math.max(...arr.slice(arr.length - length))
    : null;
}

function lowest(arr, length) {
  return arr.length >= length
    ? Math.min(...arr.slice(arr.length - length))
    : null;
}

function linreg(values, length, offset = 0) {
  if (values.length < length) return null;

  let xSum = 0;
  let ySum = 0;
  let xySum = 0;
  let xxSum = 0;

  const start = values.length - length;
  const end = values.length - 1;

  for (let i = 0; i < length; i++) {
    const x = i;
    const y = values[start + i];
    xSum += x;
    ySum += y;
    xySum += x * y;
    xxSum += x * x;
  }

  const slope = (length * xySum - xSum * ySum) / (length * xxSum - xSum * xSum);

  const intercept = (ySum - slope * xSum) / length;

  // TradingView forecast: x = length-1 + offset
  const x = length - 1 + offset;
  return slope * x + intercept;
}

function trueRange(candle, prev) {
  if (!prev) return candle.high - candle.low;
  return Math.max(
    candle.high - candle.low,
    Math.abs(candle.high - prev.close),
    Math.abs(candle.low - prev.close)
  );
}

function computeSQZMOM(candles) {
  const close = candles.map((c) => c.close);
  const high = candles.map((c) => c.high);
  const low = candles.map((c) => c.low);

  const tr = candles.map((c, i) => trueRange(c, i > 0 ? candles[i - 1] : null));

  const output = [];
  let oscHistory = [];

  for (let i = 0; i < candles.length; i++) {
    const sliceClose = close.slice(0, i + 1);

    // ---- Bollinger Bands ----
    const basis = sma(sliceClose, BB_LENGTH);
    const dev = stdev(sliceClose, BB_LENGTH);

    // ⚠ LazyBear BUG: usa multKC en lugar de multBB
    const upperBB = basis !== null ? basis + dev * KC_MULT : null;
    const lowerBB = basis !== null ? basis - dev * KC_MULT : null;

    // ---- Keltner Channels ----
    const maKC = sma(sliceClose, KC_LENGTH);
    const rangeMa = sma(tr.slice(0, i + 1), KC_LENGTH);

    const upperKC = maKC !== null ? maKC + rangeMa * KC_MULT : null;
    const lowerKC = maKC !== null ? maKC - rangeMa * KC_MULT : null;

    if (basis === null || maKC === null) {
      output.push({
        time: candles[i].time,
        value: 0,
        squeeze: "none",
      });
      continue;
    }

    // ---- Squeeze conditions ----
    const sqzOn = lowerBB > lowerKC && upperBB < upperKC;
    const sqzOff = lowerBB < lowerKC && upperBB > upperKC;

    const sqzNone = !sqzOn && !sqzOff;

    // ---- Oscillator ----
    const hi = highest(high.slice(0, i + 1), KC_LENGTH);
    const lo = lowest(low.slice(0, i + 1), KC_LENGTH);
    const midSMA = sma(sliceClose, KC_LENGTH);

    const mid = ((hi + lo) / 2 + midSMA) / 2;
    const osc = close[i] - mid;

    oscHistory.push(osc);

    const momentumValue = linreg(oscHistory, KC_LENGTH, 0) ?? 0;

    output.push({
      time: candles[i].time,
      value: momentumValue,
      squeeze: sqzOn ? "on" : sqzOff ? "off" : "none",
    });
  }

  return output;
}
</script>

<style scoped></style>
