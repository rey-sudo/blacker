<template>
  <div
    ref="chartContainer"
    class="chart-container"
    id="chart-container"
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
} from "lightweight-charts";
import { defineProps } from "vue";

const props = defineProps({
  width: {
    type: Number,
    required: true,
  },
  height: {
    type: Number,
    required: true,
  },
});

const chartContainer = ref(null);

let candleChart = null;

onMounted(async () => {
  try {
    await nextTick();

    if (!chartContainer.value) {
      console.error("Los contenedores no están disponibles");
      return;
    }

    const data = generateSeries(100);

    candleChart = createChart(chartContainer.value, {
      layout: {
        background: { color: "transparent" },
        textColor: colors.text.primary,
      },
      rightPriceScale: { visible: true },
      timeScale: {
        visible: true,
        handleScroll: false,
        handleScale: false,
        fixRightEdge: true,
        lockVisibleTimeRangeOnResize: true,
      },
      grid: {
        vertLines: { color: "transparent" },
        horzLines: { color: "transparent" },
      },
      handleScroll: false,
      handleScale: false,
      kineticScroll: false,
      crosshair: {
        mode: CrosshairMode.Normal,
      },
    });

    const candleSeries = candleChart.addSeries(CandlestickSeries, {
      upColor: colors.white,
      borderUpColor: colors.green,
      wickUpColor: colors.green,
      downColor: "rgba(0,0,0,0)",
      borderDownColor: colors.green,
      wickDownColor: colors.green,
      borderVisible: true,
    });

    candleSeries.setData(data);

    const markers = [
      {
        time: data[data.length - 1].time,
        position: "aboveBar",
        color: "green",
        shape: "arrowUp",
        text: "BUY",
      },
    ];

    createSeriesMarkers(candleSeries, markers);

    candleChart.timeScale().fitContent();
  } catch (error) {
    console.error("Error al inicializar los gráficos:", error);
  }
});

onBeforeUnmount(() => {
  if (candleChart) {
    candleChart.remove();
  }
});
</script>

<style scoped></style>
