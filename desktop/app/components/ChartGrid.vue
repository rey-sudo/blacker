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

function updateChartSize() {
  if (chartDiv.value) {
    chartWidth.value = chartDiv.value.clientWidth;
    chartHeight.value = chartDiv.value.clientHeight;
  }
}

onMounted(() => {
  updateChartSize();
  window.addEventListener("resize", updateChartSize);
});

onBeforeUnmount(() => {
  window.removeEventListener("resize", updateChartSize);
});
</script>

<style>
.app-grid {
  display: grid;
  grid-template-rows: 3fr 1fr;
  padding: 1rem;
  background-color: black;
  box-sizing: border-box;
  gap: 0.5rem;
}

.chart {
  background-color: black;
  display: flex;
  justify-content: center;
  align-items: center;
  border-radius: 8px;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
  font-size: 1.5rem;
  height: 60vh;
  box-sizing: border-box;
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
