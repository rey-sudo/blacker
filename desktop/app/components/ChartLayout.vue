<template>
  <div class="app-grid" ref="appGrid">
    <div class="chart" ref="chartDiv">
      <CandleChart :width="chartWidth" :height="chartHeight" />
    </div>

    <PadComp />

    <div class="indicators">
      <div class="indicator">
        <SqueezeChart />
      </div>
      <div class="indicator"></div>
      <div class="indicator"></div>
      <div class="indicator"></div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from "vue";

const chartDiv = ref(null);
const chartWidth = ref(0);
const chartHeight = ref(0);

let observer;

onMounted(() => {
  observer = new ResizeObserver(() => {
    if (chartDiv.value) {
      chartWidth.value = chartDiv.value.clientWidth;
      chartHeight.value = chartDiv.value.clientHeight;
    }
  });

  observer.observe(chartDiv.value);
});

onBeforeUnmount(() => {
  if (observer) observer.disconnect();
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
  height: 100%;
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
</style>
