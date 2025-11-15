<template>
  <div class="app-grid" ref="appGrid">
    <div class="chart" ref="chartDiv">
      <CandleChart :width="chartWidth" :height="chartHeight" />
    </div>

    <div class="indicators">
      <div class="indicator">Indicador 1</div>
      <div class="indicator">Indicador 2</div>
      <div class="indicator">Indicador 3</div>
      <div class="indicator">Indicador 4</div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'

const chartDiv = ref(null)
const chartWidth = ref(0)
const chartHeight = ref(0)

function updateChartSize() {
  if (chartDiv.value) {
    chartWidth.value = chartDiv.value.clientWidth
    chartHeight.value = chartDiv.value.clientHeight
  }
}

onMounted(() => {
  updateChartSize()
  window.addEventListener('resize', updateChartSize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', updateChartSize)
})
</script>

<style>
.app-grid {
  height: 90vh;
  display: grid;
  grid-template-rows: 3fr 1fr;
  gap: 1rem;
  padding: 1rem;
  background-color: black;
  box-sizing: border-box;
}

.chart {
  background-color: black;
  display: flex;
  justify-content: center;
  align-items: center;
  border-radius: 8px;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
  font-size: 1.5rem;
}

.indicators {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  grid-template-rows: repeat(2, 1fr);
  gap: 1rem;
}

.indicator {
  background-color: #3a3a3a;
  display: flex;
  justify-content: center;
  align-items: center;
  border-radius: 8px;
  box-shadow: 0 0 5px rgba(0, 0, 0, 0.5);
}
</style>
