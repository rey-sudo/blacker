<template>
  <div class="tab">
    <div class="chart" ref="chartDiv">
      <CandleChart :tabId="tabId" :width="chartWidth" :height="chartHeight" />
    </div>

    <div class="indicators">
      <div class="indicator">
        <ChartFootprint />
      </div>
      <div class="indicator">
        <IndicatorRSI
          :tabId="tabId"
          :width="chartWidth"
          :height="chartHeight / 1.5"
        />
      </div>

      <div class="indicator">
        <IndicatorADX
          :tabId="tabId"
          :width="chartWidth"
          :height="chartHeight / 1.5"
        />
      </div>
      <div class="indicator">
        <IndicatorMFI
          :tabId="tabId"
          :width="chartWidth"
          :height="chartHeight / 1.5"
        />
      </div>
      <div class="indicator">
        <IndicatorSqueeze
          :tabId="tabId"
          :width="chartWidth"
          :height="chartHeight / 1.5"
        />
      </div>
      <div class="indicator">
        <IndicatorHeikinAshi
          :tabId="tabId"
          :width="chartWidth"
          :height="chartHeight / 1.5"
        />
      </div>
    </div>
    <div class="footer"></div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from "vue";

const props = defineProps({
  tabId: {
    type: String,
    required: true,
  },
});

const useTabStore = createTabStore(props.tabId);
const tabStore = useTabStore();

const chartDiv = ref(null);
const chartWidth = ref(0);
const chartHeight = ref(0);

let chartObserver;

onMounted(async () => {
  await tabStore.start();

  chartObserver = new ResizeObserver(() => {
    const chartHeaderHeight = 48;

    if (chartDiv.value) {
      chartWidth.value = chartDiv.value.clientWidth;
      chartHeight.value = chartDiv.value.clientHeight - chartHeaderHeight;
    }
  });

  chartObserver.observe(chartDiv.value);
});

onBeforeUnmount(() => {
  if (chartObserver) chartObserver.disconnect();
});
</script>

<style lang="css" scoped>
.tab {
  display: grid;
  grid-template-rows: 3fr 1fr;
  padding: var(--tab-padding);
  box-sizing: border-box;
  gap: 0.5rem;
  height: 100vh;
  overflow-y: scroll;
  background: var(--main-background);
}

/* Chrome, Edge, Safari */
.tab::-webkit-scrollbar {
  width: 0.75rem;
}

.tab::-webkit-scrollbar-track {
  background: transparent;
}

.tab::-webkit-scrollbar-thumb {
  background: var(--color-neutral-400);
  border-radius: var(--ui-radius);
  border-right: 1px solid transparent;
  background-clip: content-box;
  cursor: grab;
}

.tab::-webkit-scrollbar-thumb:hover {
  background: var(--color-neutral-500);
}

.chart {
  display: flex;
  box-sizing: border-box;
  justify-content: center;
  align-items: center;
  min-height: 80vh;
  max-width: calc(100vw - (var(--tab-padding) * 2));
  overflow: hidden;
}

.indicators {
  display: grid;
  max-width: calc(100vw - (var(--tab-padding) * 2));
  grid-template-columns: repeat(1, 1fr);
  grid-template-rows: repeat(1, 1fr);
  gap: 0.5rem;
}

.indicator {
}

.footer {
  height: 300px;
}
</style>
