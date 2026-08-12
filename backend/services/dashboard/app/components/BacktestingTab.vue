<script setup lang="ts">
import {
  computed,
  nextTick,
  onUnmounted,
  ref,
  type ComponentPublicInstance,
} from "vue";

import { useBacktestingTabStore } from "~/stores/tabs";
import Chart, { type ChartTimeframe } from "~/components/Chart.vue";

const props = defineProps<{
  tabId: string;
}>();

// -----------------------------------------------------------------------------
// Tab / Store
// -----------------------------------------------------------------------------

const tabManager = useTabManager();
const tab = tabManager.getTabById(props.tabId)!;
const tabStore = useBacktestingTabStore(tab as BacktestingTab);

// -----------------------------------------------------------------------------
// WebSocket
// -----------------------------------------------------------------------------

// Keep the session alive for the lifetime of this component.
const _session = useBacktestingSession(props.tabId, tabStore.symbol);

// -----------------------------------------------------------------------------
// State
// -----------------------------------------------------------------------------

const activeTimeframe = ref("15m");

const timeframeIds = computed(() =>
  Object.keys(tabStore.globalState.engine_state.timeframes),
);

// -----------------------------------------------------------------------------
// Chart instances
// -----------------------------------------------------------------------------

type ChartInstance = InstanceType<typeof Chart>;

const charts = ref<Record<string, ChartInstance>>({});

const setChartRef = (
  timeframeId: string,
  instance: Element | ComponentPublicInstance | null,
) => {
  if (!instance) {
    delete charts.value[timeframeId];
    return;
  }

  const chart = instance as ChartInstance;

  // Vue can invoke the ref callback more than once.
  if (charts.value[timeframeId] === chart) {
    return;
  }

  charts.value[timeframeId] = chart;
};

// -----------------------------------------------------------------------------
// Chart updates
// -----------------------------------------------------------------------------

const updateChart = async (timeframeId: string, timeframe: ChartTimeframe) => {
  const chart = charts.value[timeframeId];

  if (!chart) return;

  // 1. Crear/reconstruir estructura
  chart.applyLayout(timeframe);

  // 2. Esperar a que Vue/DOM termine
  await nextTick();

  // 3. Aplicar opciones
  for (const [seriesId, series] of Object.entries(timeframe.series)) {
    chart.applyOptions(seriesId, {
      legend: "BTCUSDT " + timeframe.id,
    });
  }

  // 4. Finalmente datos
  for (const [seriesId, series] of Object.entries(timeframe.series)) {
    chart.patchData(seriesId, series?.history);
  }
};

const updateCharts = async () => {
  await nextTick();

  const timeframes = tabStore.globalState.engine_state.timeframes;

  for (const [timeframeId, timeframe] of Object.entries(timeframes)) {
    updateChart(timeframeId, timeframe as ChartTimeframe);
  }
};

// -----------------------------------------------------------------------------
// Store subscription
// -----------------------------------------------------------------------------

const unsubscribe = tabStore.subscribe(async (event) => {
  if (event.type !== "live-update") {
    return;
  }

  await updateCharts();
});

// -----------------------------------------------------------------------------
// Cleanup
// -----------------------------------------------------------------------------

onUnmounted(() => {
  unsubscribe();
});
</script>

<template>
  <div class="backtesting-tab">
    <BacktestingToolbar
      :tab-id="tabId"
      :timeframes="timeframeIds"
      :active-timeframe="activeTimeframe"
      @update:timeframe="activeTimeframe = $event"
    />

    <div class="charts">
      <div
        v-for="timeframeId in timeframeIds"
        :key="timeframeId"
        class="chart-wrapper"
        :class="{
          'chart-wrapper--active':
            timeframeId === activeTimeframe,
        }"
      >
        <Chart
          :ref="el => setChartRef(timeframeId, el)"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.backtesting-tab {
  gap: 0.25rem;
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  padding: var(--tab-content-padding);
}

.charts {
  position: relative;
  flex: 1;
  min-height: 0;
  width: 100%;
}

.chart-wrapper {
  position: absolute;
  inset: 0;

  width: 100%;
  height: 100%;

  visibility: hidden;
  pointer-events: none;
}

.chart-wrapper--active {
  visibility: visible;
  pointer-events: auto;
}
</style>