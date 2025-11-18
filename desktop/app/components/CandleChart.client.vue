<template>
  <div class="countdown">{{ nextClose }}</div>
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

let countdownInterval = null;
const timestamp = ref(getNow());

const nextClose = computed(() =>
  calculateCountdown(tabStore.nextClose, timestamp.value)
);

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
      barSpacing: 50,
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

  const maSeries = candleChart.addSeries(LineSeries, {
    color: colors.red,
    lineWidth: 2,
  });

  const calculateMa = (data) => {
    const maData = calculateEMAseries(data, 55);

    maSeries.setData(maData);
  };

  let markersApi = null;

  const addMarkers = (data) => {
    const marker = [
      {
        time: data[data.length - 1].time || 0,
        position: "aboveBar",
        color: "white",
        shape: "arrowUp",
        text: "BUY",
      },
    ];

    if (!markersApi) {
      markersApi = createSeriesMarkers(candleSeries, marker);
      return;
    }

    markersApi.setMarkers(marker);
  };

  watch(
    () => tabStore.candles,
    (candles) => {
      const data = [...candles];

      const lastIndex = data.length - 1;
      const penultima = lastIndex - 1;

      data[penultima] = {
        ...data[penultima],
        color: "yellow",
        borderColor: "yellow",
        wickColor: "yellow",
      };

      candleSeries.setData(data);
      calculateMa(data);
      addMarkers(data);
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

const startCountdown = () => {
  countdownInterval = setInterval(() => {
    timestamp.value = getNow();
  }, 1_000);
};

onMounted(async () => {
  try {
    await nextTick();

    if (!chartContainer.value) {
      console.error("Los contenedores no están disponibles");
      return;
    }

    setupChart();
    startCountdown();
  } catch (error) {
    console.error("Error al inicializar los gráficos:", error);
  }
});

onBeforeUnmount(() => {
  tabStore.stop();

  if (candleChart) {
    candleChart.remove();
  }

  clearInterval(countdownInterval);
});

function calculateCountdown(nextClose, nowValue) {
  let diff = nextClose - nowValue;

  if (diff <= 0) return "00d 00h 00m 00s";

  const seconds = diff % 60;
  const minutes = Math.floor(diff / 60) % 60;
  const hours = Math.floor(diff / 3600) % 24;
  const days = Math.floor(diff / 86400);

  const pad = (n) => n.toString().padStart(2, "0");

  return `${pad(days)}d ${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`;
}
</script>

<style scoped>
#chart-container {
  width: 100%;
  height: 100%;
}

.countdown {
  position: fixed;
  height: 50px;
  width: 150px;
  background: red;
  left: 0;
  top: 0;
}
</style>
