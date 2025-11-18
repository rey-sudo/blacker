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

const setupChart = () => {
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

  const calculateMa = (data) => {
    const maData = calculateMovingAverageSeriesData(data, 55);

    const maSeries = candleChart.addSeries(LineSeries, {
      color: colors.red,
      lineWidth: 2,
    });

    maSeries.setData(maData);
  };

  const addMarkers = (data) => {
    const markers = [
      {
        time: data[data.length - 1].time || 0,
        position: "aboveBar",
        color: "white",
        shape: "arrowUp",
        text: "BUY",
      },
    ];

    createSeriesMarkers(candleSeries, markers);
  };

  watch(
    () => tabStore.candles,
    (candles) => {
      candleSeries.setData(candles);
      calculateMa(candles);

      createSeriesMarkers(candleSeries, []);
      addMarkers(candles);
    },
    { deep: true }
  );

  watch(
    () => tabStore.candle,
    (candle) => {
      candleSeries.update(candle);
    },
    { deep: true }
  );

  candleChart.timeScale().fitContent();
};

const applyOptions = () => {
  if (candleChart) {
    candleChart.applyOptions({
      rightPriceScale: {
        borderVisible: false,
        mode: PriceScaleMode.Normal,
        marginRight: 0,
      },
    });
  }
};

onMounted(async () => {
  try {
    await nextTick();

    if (!chartContainer.value) {
      console.error("Los contenedores no están disponibles");
      return;
    }

    setupChart();
  } catch (error) {
    console.error("Error al inicializar los gráficos:", error);
  }
});

onBeforeUnmount(() => {
  tabStore.stop();

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
