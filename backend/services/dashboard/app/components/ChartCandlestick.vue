<template>
  <div class="chart-container">
    <div id="chart-area" class="chart-area"></div>
  </div>
</template>

<script setup lang="ts">
import { createChart } from "@/packages/src/index";
import { CandleBubbleSeries } from "@/packages/playground/indicators/CandleBubbleSeries/CandleBubbleSeries";
import type { PropType } from "vue";
import type { AnyChartSeries } from "~/packages/src/core/types";

const props = defineProps({
  history: {
    type: Array as PropType<any[]>,
    required: true,
  },
});

let candleSeries: AnyChartSeries | null = null;

onMounted(() => {
  let chart1 = createChart(document.getElementById("chart-area")!);
  chart1.api.applyOptions({ legend: "Bitcoin/Tether USD · 4h" });
  candleSeries = chart1.api.addSeries(CandleBubbleSeries);
  candleSeries.setData(props.history);
});

function updateLive(candle: any) {
  candleSeries?.update(candle);
}

defineExpose({
  updateLive,
});
</script>

<style lang="css" scoped>
.chart-container {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  overflow-y: auto;
  overflow-x: hidden;
}

.chart-area {
  min-height: 80vh;
}
</style>
