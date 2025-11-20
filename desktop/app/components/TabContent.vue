<template>
  <div class="tab">
    <PadComp />

    <div class="chart" ref="chartDiv">
      <CandleChart :tabId="tabId" :width="chartWidth" :height="chartHeight" />
    </div>

    <div class="indicators">
      <div class="indicator">
        <IndicatorRSI
          :tabId="tabId"
          :width="chartWidth"
          :height="chartHeight / 2"
        />
      </div>
      <div class="indicator">
        <IndicatorSqueeze
          :tabId="tabId"
          :width="chartWidth"
          :height="chartHeight / 2"
        />
      </div>
      <div class="indicator">
        <IndicatorADX
          :tabId="tabId"
          :width="chartWidth"
          :height="chartHeight / 2"
        />
      </div>
      <div class="indicator"></div>
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
    if (chartDiv.value) {
      chartWidth.value = chartDiv.value.clientWidth;
      chartHeight.value = chartDiv.value.clientHeight;
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
  padding: 0.5rem;
  background: black;
  box-sizing: border-box;
  gap: 0.5rem;
  height: 100vh;
  overflow-y: scroll;
  /* Firefox */
  scrollbar-width: auto;
  scrollbar-color: #555 #1a1a1a;
}

/* Chrome, Edge, Safari */
.tab::-webkit-scrollbar {
  width: 12px;
}

.tab::-webkit-scrollbar-track {
  background: #1a1a1a;
  border-radius: 12px;
}

.tab::-webkit-scrollbar-thumb {
  background: linear-gradient(180deg, #888, #555);
  border-radius: 12px;
}

.tab::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(180deg, #aaa, #666);
}

.chart {
  display: flex;
  box-sizing: border-box;
  justify-content: center;
  align-items: center;
  min-height: 70vh;
  max-width: calc(100vw - 1rem);
  overflow: hidden;
  border: 1px solid var(--border-0);
}

.indicators {
  display: grid;
  max-width: calc(100vw - 1rem);
  grid-template-columns: repeat(1, 1fr);
  grid-template-rows: repeat(1, 1fr);
  gap: 0.5rem;
}

.indicator {
  border: 1px solid var(--border-0);
}

.footer {
  height: 300px;
}
</style>
