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
});

const container = ref(null);

let indicatorChart = null;

onMounted(async () => {
  try {
    await nextTick();

    if (!container.value) {
      console.error("Los contenedores no están disponibles");
      return;
    }

    const data = generateSeries(100, 500);

    indicatorChart = createChart(container.value, {
      layout: {
        background: { color: "transparent" },
        textColor: colors.text.primary,
      },
      rightPriceScale: { visible: true },
      timeScale: { visible: true },
      grid: {
        vertLines: { color: "transparent" },
        horzLines: { color: "transparent" },
      },
    });
    
    watch(
      () => [props.width, props.height],
      ([w, h]) => {
        if (indicatorChart) {
          indicatorChart.applyOptions({ width: w, height: h });
        }
      }
    );

    function ema(values, period) {
      const k = 2 / (period + 1);
      let emaPrev = values[0] || 0;
      const result = [{ time: data[0].time, value: emaPrev }];

      for (let i = 1; i < values.length; i++) {
        emaPrev = values[i] * k + emaPrev * (1 - k);
        result.push({ time: data[i].time, value: emaPrev });
      }
      return result;
    }

    function calcMACD(data) {
      const closes = data.map((d) => d.close);

      const ema12 = ema(closes, 12);
      const ema26 = ema(closes, 26);

      const macd = ema12.map((e12, i) => ({
        time: data[i].time,
        value: e12.value - ema26[i].value,
      }));

      const signalRaw = ema(
        macd.map((m) => m.value),
        9
      );
      const signal = signalRaw.map((s, i) => ({
        time: data[i].time,
        value: s.value,
      }));

      const histogram = macd.map((m, i) => ({
        time: data[i].time,
        value: m.value - signal[i].value,
      }));

      const histogramFiltered = histogram.filter((d) => !isNaN(d.value));

      return { macd, signal, histogram: histogramFiltered };
    }

    const { macd, signal, histogram } = calcMACD(data);

    const macdLine = indicatorChart.addSeries(LineSeries, {
      color: "blue",
      lineWidth: 2,
    });
    const signalLine = indicatorChart.addSeries(LineSeries, {
      color: "red",
      lineWidth: 2,
    });

    const histogramSeries = indicatorChart.addSeries(HistogramSeries, {
      color: colors.green,
      lineWidth: 1,
      priceFormat: {
        type: "volume",
      },
    });

    macdLine.setData(macd.filter((d) => !isNaN(d.value)));
    signalLine.setData(signal.filter((d) => !isNaN(d.value)));
    histogramSeries.setData(histogram);

    indicatorChart.timeScale().fitContent();
  } catch (error) {
    console.error("Error al inicializar los gráficos:", error);
  }
});

onBeforeUnmount(() => {
  if (indicatorChart) {
    indicatorChart.remove();
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
