<template>
  <div class="main-chart">
    <div class="main-chart-header">
      89,564.00

      <UButton color="neutral" size="xs" variant="outline">15m</UButton>
      <UButton color="neutral" size="xs" variant="outline">1h</UButton>
      <UButton color="neutral" size="xs" variant="outline">4h</UButton>
      <UButton color="neutral" size="xs" variant="outline">1d</UButton>
    
    </div>

    <div class="countdown">{{ nextClose }}</div>
    <div class="main-chart-wrap">
      <div
        ref="chartContainer"
        class="chart-container"
        id="chart-container"
        :style="{ width: width + 'px', height: height + 'px' }"
      />
    </div>
  </div>
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
const colorMode = useColorMode();

const chartTheme = computed(() => colors[colorMode.value]);

const useTabStore = createTabStore(props.tabId);
const tabStore = useTabStore();

let countdownInterval = null;
const timestamp = ref(getNow());

const nextClose = computed(() =>
  calculateCountdown(tabStore.nextClose, timestamp.value)
);

const chartContainer = ref(null);

let candleChart = null;

const acc = ref(0);

const centerChart = () => {
  if (!candleChart) return;

  setTimeout(() => {
    candleChart.timeScale().applyOptions({
      rightOffset: 20,
      fixLeftEdge: false,
      fixRightEdge: false,
    });
  }, 10);
};

const setupChart = () => {
  candleChart = createChart(chartContainer.value, {
    layout: {
      background: { color: "transparent" },
      textColor: colors.text.primary,
    },
    rightPriceScale: {
      visible: true,
      mode: PriceScaleMode.Normal,
      minimumWidth: tabStore.defaultRightPriceWidth,
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
      vertLines: { color: chartTheme.value.grid.axis },
      horzLines: { color: chartTheme.value.grid.lines },
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

  let rangeFrame = null;

  candleChart.timeScale().subscribeVisibleLogicalRangeChange((range) => {
    if (rangeFrame) cancelAnimationFrame(rangeFrame);
    rangeFrame = requestAnimationFrame(() => {
      tabStore.logicalRange = range;
    });
  });

  let crosshairFrame = null;

  candleChart.subscribeCrosshairMove((value) => {
    if (crosshairFrame) cancelAnimationFrame(crosshairFrame);
    crosshairFrame = requestAnimationFrame(() => {
      tabStore.crosshair = value;
    });
  });

  const contrastTheme = {
    upColor: "transparent",
    borderUpColor: colors.green,
    wickUpColor: colors.green,
    downColor: colors.white,
    borderDownColor: colors.green,
    wickDownColor: colors.green,
    borderVisible: true,
  };

  const defaultTheme = {
    upColor: colors.candle.up,
    borderUpColor: colors.candle.up,
    wickUpColor: colors.candle.up,
    downColor: colors.candle.down,
    borderDownColor: colors.candle.down,
    wickDownColor: colors.candle.down,
    borderVisible: true,
  };

  const candleSeries = candleChart.addSeries(CandlestickSeries, defaultTheme);

  const ema55series = candleChart.addSeries(LineSeries, {
    color: colors.red,
    lineWidth: 2,
  });

  const ema25series = candleChart.addSeries(LineSeries, {
    color: colors.yellow,
    lineWidth: 1,
  });

  const calculateMa = (data) => {
    const ema55 = calculateEMAseries(data, 55);
    const ema25 = calculateEMAseries(data, 25);

    ema55series.setData(ema55);
    ema25series.setData(ema25);
  };

  let markersApi = null;

  const addMarkers = (data) => {
    const marker = [
      {
        time: data[data.length - 1].time || 0,
        position: "belowBar",
        color: "lime",
        shape: "arrowUp",
        text: "BUY LONG",
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
        // color: "yellow",
        // borderColor: "yellow",
        // wickColor: "yellow",
      };

      candleSeries.setData(data);
      calculateMa(data);
      // addMarkers(data);
    },
    { deep: true }
  );

  watch(
    () => tabStore.candle,
    (candle) => {
      candleSeries.update(candle);

      if (acc.value < 1) {
        centerChart();
      }

      acc.value++;
    },
    { deep: true }
  );
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
  background: var(--chart-background);
}

.countdown {
  position: fixed;
  height: 50px;
  width: 150px;
  right: 0;
  top: 0;
}

.main-chart {
  height: 100%;
  display: flex;
  overflow: hidden;
  flex-direction: column;
  border-bottom: 1px solid var(--border-1);
}

.main-chart-header {
  height: var(--chart-header-height);
  padding: 0 1rem;
  display: flex;
  font-weight: 700;
  align-items: center;
  color: var(--text-0);
  font-size: var(--font-size-3);
  border-bottom: 2px solid var(--border-1);
  background: var(--chart-header-background);
}

.main-chart-wrap {
  flex: 1;
}
</style>
