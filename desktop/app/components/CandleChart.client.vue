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
  LineSeries,
  PriceScaleMode,
} from "lightweight-charts";

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
      rightPriceScale: { visible: true, mode: PriceScaleMode.Normal },
      timeScale: {
        visible: true,
        handleScroll: false,
        handleScale: false,
        fixRightEdge: false,
        lockVisibleTimeRangeOnResize: true,
        barSpacing: 20,
        rightOffset: 50,
      },
      grid: {
        vertLines: { color: "transparent" },
        horzLines: { color: "transparent" },
      },
      handleScroll: true,
      handleScale: true,
      kineticScroll: true,
      crosshair: {
        mode: CrosshairMode.Normal,
      },
    });

    candleChart.applyOptions({
      rightPriceScale: {
        borderVisible: false,
        mode: PriceScaleMode.Normal,
        marginRight: 0,
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

    function calculateMovingAverageSeriesData(candleData, maLength) {
      const maData = [];

      for (let i = 0; i < candleData.length; i++) {
        if (i < maLength) {
          // Provide whitespace data points until the MA can be calculated
          maData.push({ time: candleData[i].time });
        } else {
          // Calculate the moving average, slow but simple way
          let sum = 0;
          for (let j = 0; j < maLength; j++) {
            sum += candleData[i - j].close;
          }
          const maValue = sum / maLength;
          maData.push({ time: candleData[i].time, value: maValue });
        }
      }

      return maData;
    }

    const maData = calculateMovingAverageSeriesData(data, 55);

    const maSeries = candleChart.addSeries(LineSeries, {
      color: colors.red,
      lineWidth: 2,
    });

    maSeries.setData(maData);

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
