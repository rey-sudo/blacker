<template>
  <div
    ref="container"
    id="macd-container"
    :style="{ width: width + 'px', height: height + 'px' }"
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
      rightPriceScale: { visible: true },
      timeScale: {
        visible: true,
        handleScroll: false,
        handleScale: false,
        fixLeftEdge: false,
        fixRightEdge: false,
        lockVisibleTimeRangeOnResize: true,
        barSpacing: 10,
        rightOffset: 30,
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
      () => tabStore.timerange,
      (range) => {
        if (range) {
          indicator.timeScale().setVisibleRange(range);
        }
      }
    );

    function calculateRSI(candles, period = 14) {
      const closes = candles.map((c) => c.close);
      const rsi = [];

      let gains = 0;
      let losses = 0;

      // Primera ventana
      for (let i = 1; i <= period; i++) {
        const diff = closes[i] - closes[i - 1];
        if (diff >= 0) gains += diff;
        else losses -= diff;
      }

      let avgGain = gains / period;
      let avgLoss = losses / period;

      // El primer RSI
      rsi[period] = 100 - 100 / (1 + avgGain / avgLoss);

      // Siguientes valores
      for (let i = period + 1; i < closes.length; i++) {
        const diff = closes[i] - closes[i - 1];

        const gain = Math.max(diff, 0);
        const loss = Math.max(-diff, 0);

        avgGain = (avgGain * (period - 1) + gain) / period;
        avgLoss = (avgLoss * (period - 1) + loss) / period;

        const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
        rsi[i] = 100 - 100 / (1 + rs);
      }

      // Convertimos a formato Lightweight Charts (SingleValueData)
      return rsi
        .map((value, i) => {
          if (value === undefined) return null;
          return { time: candles[i].time, value: Number(value.toFixed(2)) };
        })
        .filter((v) => v !== null);
    }

    function calculateSMA(data, period = 14) {
      const values = data.map((v) => v.value);
      const sma = [];

      for (let i = period - 1; i < values.length; i++) {
        const slice = values.slice(i - period + 1, i + 1);
        const avg = slice.reduce((a, b) => a + b, 0) / period;

        sma.push({
          time: data[i].time,
          value: Number(avg.toFixed(2)),
        });
      }

      return sma;
    }

    const rsiSeries = indicator.addSeries(LineSeries, {
      color: "purple",
      lineWidth: 2,
    });

    const smaSeries = indicator.addSeries(LineSeries, {
      color: "yellow",
      lineWidth: 2,
      priceLineVisible: false,
    });

    const line70 = indicator.addSeries(LineSeries, {
      color: "red",
      lineWidth: 1,
      priceLineVisible: false,
    });

    const line30 = indicator.addSeries(LineSeries, {
      color: "green",
      lineWidth: 1,
      priceLineVisible: false,
    });

    watch(
      () => tabStore.candle,
      (candle) => {
        if (tabStore.candles) {
          const allCandles = [...tabStore.candles.slice(0, -1), candle];

          const rsiData = calculateRSI(allCandles, 14);
          rsiSeries.setData(rsiData);

          const sma14 = calculateSMA(rsiData, 14);
          smaSeries.setData(sma14);

          if (rsiData.length > 0) {
            const first = rsiData[0].time;
            const last = rsiData[rsiData.length - 1].time;

            line70.setData([
              { time: first, value: 70 },
              { time: last, value: 70 },
            ]);

            line30.setData([
              { time: first, value: 30 },
              { time: last, value: 30 },
            ]);
          }
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
</script>

<style scoped>
#chart-container {
  width: 100%;
  height: 100%;
}

#macd-container {
  width: 100%;
  height: 200px;
  margin-top: 10px;
}
</style>
