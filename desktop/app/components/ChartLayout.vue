<template>
  <div class="app-grid" ref="appGrid">
    <div class="chart" ref="chartDiv">
      <CandleChart :width="chartWidth" :height="chartHeight" />
    </div>

    <PadComp />

    <div class="indicators">
      <div class="indicator" ref="indicatorDiv">
        <IndicatorSqueeze :width="chartWidth / 2" :height="chartHeight / 2"/>
      </div>
      <div class="indicator"></div>
      <div class="indicator"></div>
      <div class="indicator"></div>
    </div>

    <div class="footer"></div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from "vue";

const chartDiv = ref(null);
const chartWidth = ref(0);
const chartHeight = ref(0);

let chartObserver;

onMounted(() => {
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

<style>
.app-grid {
  display: grid;
  grid-template-rows: 3fr 1fr;
  padding: 1rem;
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
.app-grid::-webkit-scrollbar {
  width: 12px;
}

.app-grid::-webkit-scrollbar-track {
  background: #1a1a1a;
  border-radius: 12px;
}

.app-grid::-webkit-scrollbar-thumb {
  background: linear-gradient(180deg, #888, #555);
  border-radius: 12px;
}

.app-grid::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(180deg, #aaa, #666);
}

.chart {
  display: flex;
  box-sizing: border-box;
  justify-content: center;
  align-items: center;
  min-height: 60vh;
  overflow: hidden;
}

.indicators {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  grid-template-rows: repeat(2, 1fr);
  gap: 0.5rem;
}

.indicator {
  border: 1px solid var(--border-0);
}

.footer{
  height: 300px;
}
</style>
