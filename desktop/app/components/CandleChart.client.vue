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
    default: 1000,
  },
  height: {
    type: Number,
    required: true,
    default: 500,
  },
  tabId: {
    type: String,
    required: true,
  },
});

const useTabStore = createTabStore(props.tabId);
const tabStore = useTabStore();

const chartContainer = ref(null);

let candleChart = null;

onMounted(async () => {
  try {
    await nextTick();

    if (!chartContainer.value) {
      console.error("Los contenedores no están disponibles");
      return;
    }

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
        rightOffset: 30,
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

    watch(
      () => [props.width, props.height],
      ([w, h]) => {
        if (candleChart) {
          candleChart.applyOptions({ width: w, height: h });
        }
      }
    );

    candleChart.applyOptions({
      rightPriceScale: {
        borderVisible: false,
        mode: PriceScaleMode.Normal,
        marginRight: 0,
      },
    });

    candleChart.timeScale().subscribeVisibleTimeRangeChange((range) => {
      tabStore.timerange = range;
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

    watch(
      () => tabStore.candles,
      (data) => {
        console.log(data);
        candleSeries.setData(data);
      },
      { deep: true }
    );

    /** 
        const maData = calculateMovingAverageSeriesData(data, 55);

        const maSeries = candleChart.addSeries(LineSeries, {
          color: colors.red,
          lineWidth: 2,
        });

        maSeries.setData(maData);

        const markers = [
          {
            time: data[data.length - (1 + 50)].time || 0,
            position: "aboveBar",
            color: "green",
            shape: "arrowUp",
            text: "BUY",
          },
        ];

        createSeriesMarkers(candleSeries, markers);
        */

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

<style scoped>
#chart-container {
  width: 100%;
  height: 100%;
}
</style>
